import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolate } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { useScreenshotProtection } from "@/src/hooks/useScreenshotProtection";
import { ScreenshotToast } from "@/src/components/ScreenshotToast";

const { width: SCREEN_W } = Dimensions.get("window");
const SWIPE = SCREEN_W * 0.28;

type Q = { id: string; question: string; options: string[]; correct_index: number; explanation?: string };
type Quiz = { id: string; title: string; subtitle: string; thumbnail: string; questions: Q[] };

export default function QuizPlayer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null);
  const [shotVisible, setShotVisible] = useState(false);
  useScreenshotProtection(() => setShotVisible(true));

  useEffect(() => {
    api<Quiz>(`/quizzes/${id}`).then(q => { setQuiz(q); setAnswers(new Array(q.questions.length).fill(-1)); }).finally(() => setLoading(false));
  }, [id]);

  const tx = useSharedValue(0);
  const rot = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { rotate: `${interpolate(tx.value, [-SCREEN_W, 0, SCREEN_W], [-12, 0, 12])}deg` }],
  }));
  const overlayLeft = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [-SWIPE, 0], [1, 0], "clamp") }));
  const overlayRight = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [0, SWIPE], [0, 1], "clamp") }));

  const advance = (dir: 1 | -1) => {
    if (!quiz) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = Math.max(0, Math.min(quiz.questions.length, idx + dir));
    setIdx(next);
    setSelected(answers[next] >= 0 ? answers[next] : null);
    tx.value = 0;
  };

  const submitAnswers = async (finalAns: number[]) => {
    try {
      const r = await api<any>("/quizzes/submit", { method: "POST", body: { quiz_id: id, answers: finalAns } });
      setResult(r);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
  };

  const pan = Gesture.Pan()
    .onUpdate(e => { tx.value = e.translationX; })
    .onEnd(e => {
      if (e.translationX > SWIPE && idx < (quiz?.questions.length ?? 0) - 1) {
        tx.value = withTiming(SCREEN_W, { duration: 180 }, () => { runOnJS(advance)(1); });
      } else if (e.translationX < -SWIPE && idx > 0) {
        tx.value = withTiming(-SCREEN_W, { duration: 180 }, () => { runOnJS(advance)(-1); });
      } else {
        tx.value = withSpring(0);
      }
    });

  if (loading || !quiz) return <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View>;

  if (result) {
    const ok = result.percentage >= 60;
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.color.surface }]}>
        <View style={styles.resultCard}>
          <Feather name={ok ? "award" : "refresh-cw"} size={56} color={theme.color.brand} />
          <Text style={styles.rTitle}>{ok ? "Well done!" : "Keep practicing"}</Text>
          <Text style={styles.rScore}>{result.score} / {result.total}</Text>
          <Text style={styles.rPct}>{result.percentage}%</Text>
          <Pressable testID="quiz-done" style={styles.rCta} onPress={() => router.back()}>
            <Text style={{ color: theme.color.onBrandPrimary, fontWeight: "800" }}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const q = quiz.questions[idx];
  const progress = ((idx + 1) / quiz.questions.length) * 100;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="quiz-back" onPress={() => router.back()} style={styles.iconBtn}><Feather name="chevron-left" size={22} color={theme.color.onSurface} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.qHead}>{quiz.title}</Text>
          <View style={styles.bar}><View style={[styles.barFill, { width: `${progress}%` }]} /></View>
        </View>
        <Text style={styles.counter}>{idx + 1}/{quiz.questions.length}</Text>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, rot]}>
          <Image source={{ uri: quiz.thumbnail }} style={styles.cardImg} contentFit="cover" />
          <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(10,13,11,0.85)" }} />
          <Animated.View style={[styles.tag, styles.tagLeft, overlayLeft]}><Text style={styles.tagText}>← PREV</Text></Animated.View>
          <Animated.View style={[styles.tag, styles.tagRight, overlayRight]}><Text style={styles.tagText}>NEXT →</Text></Animated.View>

          <View style={styles.cardInner}>
            <Text style={styles.qNumber}>QUESTION {idx + 1}</Text>
            <Text style={styles.qText}>{q.question}</Text>
            <View style={{ gap: 10, marginTop: 18 }}>
              {q.options.map((opt, oi) => {
                const isSelected = selected === oi;
                return (
                  <Pressable
                    key={oi}
                    testID={`option-${oi}`}
                    onPress={() => {
                      setSelected(oi);
                      const a = [...answers];
                      a[idx] = oi;
                      setAnswers(a);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                    style={[styles.opt, isSelected && styles.optSelected]}
                  >
                    <View style={[styles.bullet, isSelected && { backgroundColor: theme.color.brand, borderColor: theme.color.brand }]}>
                      {isSelected && <Feather name="check" size={14} color={theme.color.onBrandPrimary} />}
                    </View>
                    <Text style={[styles.optText, isSelected && { color: theme.color.onSurface, fontWeight: "700" }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      <View style={styles.footer}>
        <Pressable testID="prev-question" onPress={() => idx > 0 && advance(-1)} style={[styles.fBtn, idx === 0 && { opacity: 0.4 }]} disabled={idx === 0}>
          <Feather name="chevron-left" size={18} color={theme.color.onSurface} />
          <Text style={styles.fText}>Prev</Text>
        </Pressable>
        {idx < quiz.questions.length - 1 ? (
          <Pressable testID="next-question" onPress={() => advance(1)} style={[styles.fBtn, styles.fNext]}>
            <Text style={[styles.fText, { color: theme.color.onBrandPrimary, fontWeight: "800" }]}>Next</Text>
            <Feather name="chevron-right" size={18} color={theme.color.onBrandPrimary} />
          </Pressable>
        ) : (
          <Pressable testID="submit-quiz" onPress={() => submitAnswers(answers.map(a => (a < 0 ? 0 : a)))} style={[styles.fBtn, styles.fNext]}>
            <Text style={[styles.fText, { color: theme.color.onBrandPrimary, fontWeight: "800" }]}>Submit</Text>
            <Feather name="send" size={16} color={theme.color.onBrandPrimary} />
          </Pressable>
        )}
      </View>
      <Text style={styles.hint}>Swipe ← → between questions</Text>
      <ScreenshotToast visible={shotVisible} onHide={() => setShotVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.color.surface },
  header: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: 1, borderColor: theme.color.border },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  qHead: { color: theme.color.onSurface, fontWeight: "700", fontSize: 14 },
  counter: { color: theme.color.brand, fontWeight: "800", fontSize: 12 },
  bar: { height: 4, backgroundColor: theme.color.surfaceTertiary, borderRadius: 999, marginTop: 6, overflow: "hidden" },
  barFill: { height: 4, backgroundColor: theme.color.brand },
  card: { flex: 1, margin: 16, borderRadius: 24, overflow: "hidden", backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border },
  cardImg: { ...StyleSheet.absoluteFillObject },
  cardInner: { padding: 22, flex: 1, justifyContent: "center" },
  qNumber: { color: theme.color.brand, fontSize: 11, letterSpacing: 1.4, fontWeight: "800" },
  qText: { color: theme.color.onSurface, fontSize: 22, fontWeight: "700", marginTop: 10, lineHeight: 30 },
  opt: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: "rgba(20,26,22,0.7)", borderWidth: 1, borderColor: theme.color.border },
  optSelected: { borderColor: theme.color.brand, backgroundColor: "rgba(197,160,89,0.12)" },
  bullet: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: theme.color.borderStrong, alignItems: "center", justifyContent: "center" },
  optText: { color: theme.color.onSurfaceSecondary, fontSize: 14, flex: 1 },
  tag: { position: "absolute", top: 24, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  tagLeft: { left: 20, borderColor: theme.color.brand, backgroundColor: "rgba(197,160,89,0.15)" },
  tagRight: { right: 20, borderColor: theme.color.brand, backgroundColor: "rgba(197,160,89,0.15)" },
  tagText: { color: theme.color.brand, fontWeight: "800", letterSpacing: 1 },
  footer: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  fBtn: { flex: 1, height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border },
  fNext: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  fText: { color: theme.color.onSurface, fontSize: 14, fontWeight: "600" },
  hint: { textAlign: "center", color: theme.color.onSurfaceTertiary, fontSize: 11, paddingBottom: 16 },
  resultCard: { alignItems: "center", padding: 32, gap: 8, backgroundColor: theme.color.surfaceSecondary, borderRadius: 24, marginHorizontal: 24, borderWidth: 1, borderColor: theme.color.border },
  rTitle: { color: theme.color.onSurface, fontSize: 22, fontWeight: "800", marginTop: 12 },
  rScore: { color: theme.color.brand, fontSize: 48, fontWeight: "800", marginTop: 8 },
  rPct: { color: theme.color.onSurfaceSecondary, fontSize: 14 },
  rCta: { marginTop: 18, backgroundColor: theme.color.brand, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 999 },
});
