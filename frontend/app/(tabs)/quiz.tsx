import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

type QuizSummary = { id: string; title: string; subtitle: string; category: string; thumbnail: string; question_count: number };

export default function QuizListScreen() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    api<QuizSummary[]>("/quizzes").then(setQuizzes).catch(() => {}).finally(() => setLoading(false));
  }, []));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Swipe Quizzes</Text>
        <Text style={styles.sub}>Test your wisdom — swipe to answer</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator color={theme.color.brand} style={{ marginTop: 40 }} /> : quizzes.map(q => (
          <Pressable key={q.id} testID={`quiz-${q.id}`} onPress={() => router.push(`/quiz/${q.id}`)} style={styles.card}>
            <Image source={{ uri: q.thumbnail }} style={styles.thumb} contentFit="cover" />
            <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(10,13,11,0.55)" }} />
            <View style={styles.cardInner}>
              <Text style={styles.cat}>{q.category.toUpperCase()}</Text>
              <Text style={styles.qTitle}>{q.title}</Text>
              <Text style={styles.qSub}>{q.subtitle}</Text>
              <View style={styles.meta}>
                <Feather name="layers" size={12} color={theme.color.brand} />
                <Text style={styles.metaText}>{q.question_count} questions</Text>
                <View style={styles.startBtn}>
                  <Text style={styles.startText}>Start</Text>
                  <Feather name="arrow-right" size={12} color={theme.color.onBrandPrimary} />
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { color: theme.color.onSurface, fontSize: 26, fontWeight: "800" },
  sub: { color: theme.color.onSurfaceSecondary, marginTop: 4 },
  card: { height: 200, borderRadius: 20, overflow: "hidden", backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border },
  thumb: { ...StyleSheet.absoluteFillObject },
  cardInner: { flex: 1, padding: 18, justifyContent: "flex-end" },
  cat: { color: theme.color.brand, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  qTitle: { color: theme.color.onSurface, fontSize: 22, fontWeight: "800", marginTop: 4 },
  qSub: { color: theme.color.onSurfaceSecondary, marginTop: 4, fontSize: 13 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  metaText: { color: theme.color.onSurfaceSecondary, fontSize: 12, flex: 1 },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.color.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  startText: { color: theme.color.onBrandPrimary, fontWeight: "800", fontSize: 12 },
});
