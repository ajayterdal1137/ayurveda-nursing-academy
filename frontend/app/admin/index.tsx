import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";

type Stats = { courses: number; quizzes: number; students: number; enrollments: number; orders_paid: number };

const LESSON_TYPES = ["video", "pdf", "word"] as const;

type LessonDraft = { title: string; type: typeof LESSON_TYPES[number]; url: string; duration: string; preview: boolean };

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"stats" | "newCourse" | "newQuiz">("stats");

  // course form
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Fundamentals");
  const [instructor, setInstructor] = useState(user?.name || "");
  const [thumb, setThumb] = useState("https://images.pexels.com/photos/36863397/pexels-photo-36863397.jpeg?auto=compress&cs=tinysrgb&w=940");
  const [priceInr, setPriceInr] = useState("999");
  const [priceUsd, setPriceUsd] = useState("19");
  const [duration, setDuration] = useState("3h");
  const [lessons, setLessons] = useState<LessonDraft[]>([
    { title: "", type: "video", url: "", duration: "", preview: true },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // quiz form
  const [qTitle, setQTitle] = useState("");
  const [qSub, setQSub] = useState("");
  const [qCat, setQCat] = useState("Fundamentals");
  const [qThumb, setQThumb] = useState("https://images.pexels.com/photos/36863397/pexels-photo-36863397.jpeg?auto=compress&cs=tinysrgb&w=940");
  const [questions, setQuestions] = useState([
    { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" },
  ]);

  useFocusEffect(useCallback(() => {
    api<Stats>("/admin/stats").then(setStats).catch(() => {});
  }, []));

  if (user && user.role !== "admin" && user.role !== "teacher") {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}>
        <Feather name="lock" size={40} color={theme.color.error} />
        <Text style={styles.locked}>This area is for admins & teachers only.</Text>
        <Pressable testID="admin-back" onPress={() => router.back()} style={styles.btn}><Text style={styles.btnT}>Go Back</Text></Pressable>
      </SafeAreaView>
    );
  }

  const addLesson = () => setLessons(prev => [...prev, { title: "", type: "video", url: "", duration: "", preview: false }]);
  const updateLesson = (i: number, patch: Partial<LessonDraft>) => setLessons(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const removeLesson = (i: number) => setLessons(prev => prev.filter((_, idx) => idx !== i));

  const submitCourse = async () => {
    if (!title || !subtitle || !desc || !instructor || lessons.length === 0 || !lessons[0].title) {
      setMsg("Fill title, subtitle, description, instructor, and at least one lesson");
      return;
    }
    setSubmitting(true); setMsg(null);
    try {
      await api("/courses", { method: "POST", body: {
        title, subtitle, description: desc, category, instructor, thumbnail: thumb,
        price_inr: parseInt(priceInr || "0", 10), price_usd: parseInt(priceUsd || "0", 10),
        duration, featured: false, tags: [],
        lessons: lessons.map((l, i) => ({ ...l, order: i + 1 })),
      }});
      setMsg("✓ Course created successfully");
      setTitle(""); setSubtitle(""); setDesc(""); setLessons([{ title: "", type: "video", url: "", duration: "", preview: true }]);
      api<Stats>("/admin/stats").then(setStats).catch(() => {});
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addQuestion = () => setQuestions(p => [...p, { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }]);
  const updateQ = (i: number, patch: any) => setQuestions(p => p.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  const updateOpt = (qi: number, oi: number, v: string) => setQuestions(p => p.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, oidx) => oidx === oi ? v : o) } : q));
  const removeQ = (i: number) => setQuestions(p => p.filter((_, idx) => idx !== i));

  const submitQuiz = async () => {
    if (!qTitle || questions.length === 0 || !questions[0].question) {
      setMsg("Fill quiz title + at least one question with options");
      return;
    }
    setSubmitting(true); setMsg(null);
    try {
      await api("/admin/quizzes", { method: "POST", body: {
        title: qTitle, subtitle: qSub, category: qCat, thumbnail: qThumb,
        questions: questions.map(q => ({ ...q, options: q.options.filter(o => o.trim()) })),
      }});
      setMsg("✓ Quiz created successfully");
      setQTitle(""); setQSub(""); setQuestions([{ question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }]);
      api<Stats>("/admin/stats").then(setStats).catch(() => {});
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="admin-back-btn"><Feather name="chevron-left" size={22} color={theme.color.onSurface} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.sub}>Manage content & students</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(["stats", "newCourse", "newQuiz"] as const).map(k => (
          <Pressable key={k} testID={`admin-tab-${k}`} onPress={() => { setTab(k); setMsg(null); }} style={[styles.tab, tab === k && styles.tabActive]}>
            <Text style={[styles.tabText, tab === k && { color: theme.color.onBrandPrimary, fontWeight: "800" }]}>
              {k === "stats" ? "Stats" : k === "newCourse" ? "+ Course" : "+ Quiz"}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {tab === "stats" && (
            <View style={{ gap: 12 }}>
              {!stats && <ActivityIndicator color={theme.color.brand} />}
              {stats && (
                <View style={styles.statGrid}>
                  <StatCard label="Courses" value={stats.courses} icon="book-open" />
                  <StatCard label="Quizzes" value={stats.quizzes} icon="zap" />
                  <StatCard label="Students" value={stats.students} icon="users" />
                  <StatCard label="Enrollments" value={stats.enrollments} icon="user-check" />
                  <StatCard label="Paid Orders" value={stats.orders_paid} icon="credit-card" />
                </View>
              )}
            </View>
          )}

          {tab === "newCourse" && (
            <View style={{ gap: 10 }}>
              <Label>Title</Label>
              <Input testID="course-title" value={title} onChangeText={setTitle} placeholder="e.g. Foundations of Ayurveda" />
              <Label>Subtitle</Label>
              <Input testID="course-subtitle" value={subtitle} onChangeText={setSubtitle} placeholder="One-line tagline" />
              <Label>Description</Label>
              <Input testID="course-desc" value={desc} onChangeText={setDesc} placeholder="Detailed description..." multiline style={{ height: 90, textAlignVertical: "top" }} />
              <Label>Category</Label>
              <Input testID="course-category" value={category} onChangeText={setCategory} placeholder="Fundamentals / Panchakarma / ..." />
              <Label>Instructor name</Label>
              <Input testID="course-instructor" value={instructor} onChangeText={setInstructor} />
              <Label>Thumbnail image URL</Label>
              <Input testID="course-thumb" value={thumb} onChangeText={setThumb} autoCapitalize="none" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}><Label>Price (INR)</Label><Input testID="course-price-inr" value={priceInr} onChangeText={setPriceInr} keyboardType="number-pad" /></View>
                <View style={{ flex: 1 }}><Label>Price (USD)</Label><Input testID="course-price-usd" value={priceUsd} onChangeText={setPriceUsd} keyboardType="number-pad" /></View>
                <View style={{ flex: 1 }}><Label>Duration</Label><Input testID="course-duration" value={duration} onChangeText={setDuration} placeholder="6h 20m" /></View>
              </View>

              <Text style={styles.section}>Lessons ({lessons.length})</Text>
              {lessons.map((l, i) => (
                <View key={i} style={styles.lessonBox}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: theme.color.brand, fontWeight: "800" }}>Lesson {i + 1}</Text>
                    {lessons.length > 1 && (
                      <Pressable onPress={() => removeLesson(i)} testID={`lesson-remove-${i}`} hitSlop={8}>
                        <Feather name="trash-2" size={16} color={theme.color.error} />
                      </Pressable>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                    {LESSON_TYPES.map(tp => (
                      <Pressable key={tp} testID={`lesson-type-${i}-${tp}`} onPress={() => updateLesson(i, { type: tp })} style={[styles.typeChip, l.type === tp && styles.typeChipActive]}>
                        <Text style={[styles.typeChipText, l.type === tp && { color: theme.color.onBrandPrimary, fontWeight: "800" }]}>{tp.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                    <Pressable testID={`lesson-preview-${i}`} onPress={() => updateLesson(i, { preview: !l.preview })} style={[styles.previewToggle, l.preview && styles.previewToggleActive]}>
                      <Feather name={l.preview ? "check-square" : "square"} size={12} color={l.preview ? theme.color.onBrandPrimary : theme.color.brand} />
                      <Text style={[styles.previewToggleText, l.preview && { color: theme.color.onBrandPrimary }]}>FREE</Text>
                    </Pressable>
                  </View>
                  <Input testID={`lesson-title-${i}`} value={l.title} onChangeText={v => updateLesson(i, { title: v })} placeholder="Lesson title" />
                  <Input testID={`lesson-url-${i}`} value={l.url} onChangeText={v => updateLesson(i, { url: v })} placeholder={`${l.type.toUpperCase()} URL (https://...)`} autoCapitalize="none" />
                  <Input testID={`lesson-duration-${i}`} value={l.duration} onChangeText={v => updateLesson(i, { duration: v })} placeholder="Duration e.g. 12:30" />
                </View>
              ))}
              <Pressable testID="add-lesson" onPress={addLesson} style={styles.addBtn}>
                <Feather name="plus" size={16} color={theme.color.brand} />
                <Text style={{ color: theme.color.brand, fontWeight: "700" }}>Add another lesson</Text>
              </Pressable>

              {msg && <Text style={[styles.msg, msg.startsWith("✓") && { color: theme.color.success }]}>{msg}</Text>}

              <Pressable testID="submit-course" onPress={submitCourse} disabled={submitting} style={styles.submitBtn}>
                {submitting ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : <Text style={styles.submitText}>Publish Course</Text>}
              </Pressable>
            </View>
          )}

          {tab === "newQuiz" && (
            <View style={{ gap: 10 }}>
              <Label>Quiz title</Label>
              <Input testID="quiz-title" value={qTitle} onChangeText={setQTitle} placeholder="e.g. Doshas Quick Test" />
              <Label>Subtitle</Label>
              <Input testID="quiz-subtitle" value={qSub} onChangeText={setQSub} />
              <Label>Category</Label>
              <Input testID="quiz-category" value={qCat} onChangeText={setQCat} />
              <Label>Thumbnail URL</Label>
              <Input testID="quiz-thumb" value={qThumb} onChangeText={setQThumb} autoCapitalize="none" />

              <Text style={styles.section}>Questions ({questions.length})</Text>
              {questions.map((q, qi) => (
                <View key={qi} style={styles.lessonBox}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: theme.color.brand, fontWeight: "800" }}>Q{qi + 1}</Text>
                    {questions.length > 1 && (
                      <Pressable onPress={() => removeQ(qi)} testID={`q-remove-${qi}`} hitSlop={8}>
                        <Feather name="trash-2" size={16} color={theme.color.error} />
                      </Pressable>
                    )}
                  </View>
                  <Input testID={`q-text-${qi}`} value={q.question} onChangeText={v => updateQ(qi, { question: v })} placeholder="Question text" multiline />
                  {q.options.map((opt, oi) => (
                    <View key={oi} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable testID={`q-correct-${qi}-${oi}`} onPress={() => updateQ(qi, { correct_index: oi })} hitSlop={8}>
                        <Feather name={q.correct_index === oi ? "check-circle" : "circle"} size={20} color={q.correct_index === oi ? theme.color.success : theme.color.onSurfaceTertiary} />
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <Input testID={`q-opt-${qi}-${oi}`} value={opt} onChangeText={v => updateOpt(qi, oi, v)} placeholder={`Option ${oi + 1}`} />
                      </View>
                    </View>
                  ))}
                  <Input testID={`q-expl-${qi}`} value={q.explanation} onChangeText={v => updateQ(qi, { explanation: v })} placeholder="Explanation (optional)" />
                </View>
              ))}
              <Pressable testID="add-question" onPress={addQuestion} style={styles.addBtn}>
                <Feather name="plus" size={16} color={theme.color.brand} />
                <Text style={{ color: theme.color.brand, fontWeight: "700" }}>Add another question</Text>
              </Pressable>

              {msg && <Text style={[styles.msg, msg.startsWith("✓") && { color: theme.color.success }]}>{msg}</Text>}

              <Pressable testID="submit-quiz-admin" onPress={submitQuiz} disabled={submitting} style={styles.submitBtn}>
                {submitting ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : <Text style={styles.submitText}>Publish Quiz</Text>}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: theme.color.onSurfaceSecondary, fontSize: 12, fontWeight: "600", marginTop: 4 }}>{children}</Text>;
}
function Input(props: any) {
  return <TextInput {...props} placeholderTextColor={theme.color.onSurfaceTertiary} style={[styles.input, props.style]} />;
}
function StatCard({ label, value, icon }: { label: string; value: number; icon: any }) {
  return (
    <View style={styles.statCard}>
      <Feather name={icon} size={20} color={theme.color.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { color: theme.color.onSurface, fontSize: 22, fontWeight: "800" },
  sub: { color: theme.color.onSurfaceSecondary, fontSize: 12 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, height: 38, borderRadius: 999, backgroundColor: theme.color.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.color.border },
  tabActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  tabText: { color: theme.color.onSurface, fontWeight: "600", fontSize: 13 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "31%", padding: 14, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border, alignItems: "center", gap: 4 },
  statValue: { color: theme.color.onSurface, fontSize: 22, fontWeight: "800", marginTop: 4 },
  statLabel: { color: theme.color.onSurfaceTertiary, fontSize: 10, letterSpacing: 0.5 },
  input: { backgroundColor: theme.color.surfaceTertiary, borderRadius: 10, color: theme.color.onSurface, padding: 12, borderWidth: 1, borderColor: theme.color.border, fontSize: 14, marginTop: 4 },
  section: { color: theme.color.onSurface, fontWeight: "700", marginTop: 16, marginBottom: 4 },
  lessonBox: { padding: 12, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border, gap: 6 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.color.surfaceTertiary, borderWidth: 1, borderColor: theme.color.border },
  typeChipActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  typeChipText: { color: theme.color.onSurface, fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  previewToggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.color.brand, marginLeft: "auto" },
  previewToggleActive: { backgroundColor: theme.color.brand },
  previewToggleText: { color: theme.color.brand, fontSize: 10, fontWeight: "800" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: theme.color.brand },
  submitBtn: { backgroundColor: theme.color.brand, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 12 },
  submitText: { color: theme.color.onBrandPrimary, fontWeight: "800", fontSize: 15 },
  msg: { color: theme.color.error, fontSize: 13, padding: 8, textAlign: "center" },
  locked: { color: theme.color.onSurface, fontSize: 16, fontWeight: "700", marginTop: 16 },
  btn: { marginTop: 20, backgroundColor: theme.color.brand, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999 },
  btnT: { color: theme.color.onBrandPrimary, fontWeight: "800" },
});
