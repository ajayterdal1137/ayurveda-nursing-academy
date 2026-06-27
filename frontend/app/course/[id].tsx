import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Share } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, e] = await Promise.all([api(`/courses/${id}`), api(`/enrollments/check/${id}`)]);
        setCourse(c); setEnrolled((e as any).enrolled);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <View style={{ flex: 1, backgroundColor: theme.color.surface, justifyContent: "center", alignItems: "center" }}><ActivityIndicator color={theme.color.brand} /></View>;
  if (!course) return null;

  const iconFor = (t: string) => t === "video" ? "play-circle" : t === "pdf" ? "file-text" : "file";

  const shareCourse = async (channel: "whatsapp" | "native") => {
    const url = `https://ayurveda-learn-2.preview.emergentagent.com/course/${course.id}`;
    const message = `🪔 Check out *${course.title}* on Ayurveda Nursing Academy!\n\n${course.subtitle}\n\n👨‍🏫 ${course.instructor}\n⏱ ${course.duration}\n💰 ₹${course.price_inr}\n\n${url}`;
    if (channel === "whatsapp") {
      const wa = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const fallback = `https://wa.me/?text=${encodeURIComponent(message)}`;
      try {
        const can = await Linking.canOpenURL(wa);
        await Linking.openURL(can ? wa : fallback);
      } catch {
        Linking.openURL(fallback);
      }
    } else {
      try {
        if (Platform.OS === "web" && (navigator as any).share) {
          await (navigator as any).share({ title: course.title, text: message, url });
        } else if (Platform.OS !== "web") {
          await Share.share({ message });
        }
      } catch {}
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: course.thumbnail }} style={styles.heroImg} contentFit="cover" />
          <LinearGradient colors={["rgba(10,13,11,0.3)", "transparent", "rgba(10,13,11,0.95)"]} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={styles.heroSafe} edges={["top"]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Pressable testID="back-button" onPress={() => router.back()} style={styles.back}><Feather name="chevron-left" size={24} color={theme.color.onSurface} /></Pressable>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable testID="share-whatsapp-course" onPress={() => shareCourse("whatsapp")} style={[styles.back, { backgroundColor: "#25D366" }]}>
                  <Feather name="message-circle" size={18} color="#FFFFFF" />
                </Pressable>
                <Pressable testID="share-native-course" onPress={() => shareCourse("native")} style={styles.back}>
                  <Feather name="share-2" size={18} color={theme.color.onSurface} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
          <View style={styles.heroContent}>
            <Text style={styles.cat}>{course.category.toUpperCase()}</Text>
            <Text style={styles.title}>{course.title}</Text>
            <Text style={styles.sub}>{course.subtitle}</Text>
            <View style={styles.metaRow}>
              <View style={styles.meta}><Feather name="star" size={12} color={theme.color.brand} /><Text style={styles.metaT}>{course.rating}</Text></View>
              <View style={styles.meta}><Feather name="users" size={12} color={theme.color.brand} /><Text style={styles.metaT}>{course.students_count}</Text></View>
              <View style={styles.meta}><Feather name="clock" size={12} color={theme.color.brand} /><Text style={styles.metaT}>{course.duration}</Text></View>
            </View>
          </View>
        </View>

        <View style={{ padding: 20, gap: 20 }}>
          <View>
            <Text style={styles.section}>About this course</Text>
            <Text style={styles.body}>{course.description}</Text>
          </View>

          <View style={styles.instructorRow}>
            <View style={styles.instAvatar}><Text style={{ color: theme.color.brand, fontWeight: "800" }}>{course.instructor.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</Text></View>
            <View>
              <Text style={styles.instName}>{course.instructor}</Text>
              <Text style={styles.instRole}>Course instructor</Text>
            </View>
          </View>

          <View>
            <Text style={styles.section}>Curriculum · {course.lessons.length} lessons</Text>
            <View style={{ gap: 10 }}>
              {course.lessons.map((l: any, i: number) => {
                const canPlay = enrolled || l.preview;
                return (
                <Pressable key={l.id} testID={`lesson-${l.id}`} onPress={() => {
                  if (!canPlay) return router.push(`/checkout/${course.id}`);
                  router.push({ pathname: "/lesson/[id]", params: { id: l.id, courseId: course.id, type: l.type, url: l.url, title: l.title } });
                }} style={styles.lesson}>
                  <View style={styles.lNum}><Text style={{ color: theme.color.brand, fontWeight: "800" }}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lTitle} numberOfLines={1}>{l.title}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <Text style={styles.lMeta}>{l.type.toUpperCase()} · {l.duration || "—"}</Text>
                      {l.preview && (
                        <View style={styles.previewBadge}>
                          <Feather name="gift" size={9} color={theme.color.onBrandPrimary} />
                          <Text style={styles.previewText}>FREE</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Feather name={canPlay ? iconFor(l.type) : "lock"} size={18} color={theme.color.brand} />
                </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.ctaBar}>
        <View>
          <Text style={styles.priceL}>Price</Text>
          <Text style={styles.priceV}>₹{course.price_inr} <Text style={styles.priceUsd}>· ${course.price_usd}</Text></Text>
        </View>
        <Pressable
          testID={enrolled ? "start-learning-cta" : "enroll-cta"}
          onPress={() => enrolled
            ? router.push({ pathname: "/lesson/[id]", params: { id: course.lessons[0].id, courseId: course.id, type: course.lessons[0].type, url: course.lessons[0].url, title: course.lessons[0].title } })
            : router.push(`/checkout/${course.id}`)}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>{enrolled ? "Start Learning" : "Enroll Now"}</Text>
          <Feather name="arrow-right" size={18} color={theme.color.onBrandPrimary} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { height: 360 },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroSafe: { padding: 16 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(10,13,11,0.6)", alignItems: "center", justifyContent: "center" },
  heroContent: { position: "absolute", left: 20, right: 20, bottom: 20 },
  cat: { color: theme.color.brand, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: theme.color.onSurface, fontSize: 28, fontWeight: "800", marginTop: 6 },
  sub: { color: theme.color.onSurfaceSecondary, marginTop: 6, fontSize: 14 },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(20,26,22,0.7)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  metaT: { color: theme.color.onSurface, fontSize: 12 },
  section: { color: theme.color.onSurface, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  body: { color: theme.color.onSurfaceSecondary, fontSize: 14, lineHeight: 22 },
  instructorRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: theme.color.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: theme.color.border },
  instAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.color.brandSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.color.brand },
  instName: { color: theme.color.onSurface, fontWeight: "700" },
  instRole: { color: theme.color.onSurfaceTertiary, fontSize: 12 },
  lesson: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border },
  previewBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: theme.color.brand },
  previewText: { color: theme.color.onBrandPrimary, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  lNum: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.color.brandSecondary, alignItems: "center", justifyContent: "center" },
  lTitle: { color: theme.color.onSurface, fontWeight: "600" },
  lMeta: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  ctaBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: theme.color.surfaceSecondary, borderTopWidth: 1, borderColor: theme.color.border, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceL: { color: theme.color.onSurfaceTertiary, fontSize: 11 },
  priceV: { color: theme.color.onSurface, fontSize: 20, fontWeight: "800" },
  priceUsd: { color: theme.color.onSurfaceTertiary, fontSize: 13, fontWeight: "400" },
  cta: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.color.brand, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999 },
  ctaText: { color: theme.color.onBrandPrimary, fontWeight: "800", fontSize: 15 },
});
