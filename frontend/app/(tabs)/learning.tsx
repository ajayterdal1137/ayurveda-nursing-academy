import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

type LiveClass = { id: string; title: string; instructor: string; starts_at: string; duration_min: number; thumbnail: string; description: string };
type Learning = { id: string; course_id: string; progress: number; certificate_issued: boolean; course: any };

export default function LearningScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Learning[]>([]);
  const [live, setLive] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [l, lv] = await Promise.all([api<Learning[]>("/my/learning"), api<LiveClass[]>("/live-classes")]);
      setItems(l); setLive(lv);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Learning</Text>
        <Text style={styles.sub}>Pick up where you left off</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator color={theme.color.brand} style={{ marginTop: 40 }} /> : (
          <>
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {items.length === 0 && (
                <View style={styles.empty}>
                  <Feather name="book-open" size={32} color={theme.color.brand} />
                  <Text style={styles.emptyTitle}>Your learning journey begins here</Text>
                  <Text style={styles.emptySub}>Enroll in a course to track progress and earn certificates.</Text>
                  <Pressable onPress={() => router.push("/(tabs)/home")} testID="browse-courses-cta" style={styles.cta}>
                    <Text style={styles.ctaText}>Browse Courses</Text>
                  </Pressable>
                </View>
              )}

              {items.map(it => (
                <Pressable key={it.id} testID={`learning-${it.course_id}`} onPress={() => router.push(`/course/${it.course_id}`)} style={styles.card}>
                  <Image source={{ uri: it.course?.thumbnail }} style={styles.thumb} contentFit="cover" />
                  <View style={{ flex: 1, padding: 12 }}>
                    <Text style={styles.cardCat}>{it.course?.category}</Text>
                    <Text style={styles.cardTitle} numberOfLines={2}>{it.course?.title}</Text>
                    <View style={styles.barWrap}>
                      <View style={[styles.bar, { width: `${Math.min(100, it.progress)}%` }]} />
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <Text style={styles.cardMeta}>{Math.round(it.progress)}% complete</Text>
                      {it.certificate_issued && (
                        <Pressable testID={`view-cert-${it.id}`} onPress={(e) => { e.stopPropagation(); router.push(`/certificate/${it.id}`); }} style={styles.certPill}>
                          <Feather name="award" size={11} color={theme.color.onBrandPrimary} />
                          <Text style={styles.certPillText}>Certificate</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionH}>Upcoming Live Classes</Text>
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {live.map(l => (
                <View key={l.id} style={styles.liveCard} testID={`live-${l.id}`}>
                  <Image source={{ uri: l.thumbnail }} style={{ width: "100%", height: 130 }} contentFit="cover" />
                  <View style={{ padding: 12 }}>
                    <View style={styles.livePill}><Text style={styles.livePillText}>● LIVE · {new Date(l.starts_at).toLocaleString()}</Text></View>
                    <Text style={styles.cardTitle}>{l.title}</Text>
                    <Text style={styles.cardMeta}>{l.instructor} · {l.duration_min} min</Text>
                    <Text numberOfLines={2} style={[styles.cardMeta, { marginTop: 6 }]}>{l.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { color: theme.color.onSurface, fontSize: 26, fontWeight: "800" },
  sub: { color: theme.color.onSurfaceSecondary, marginTop: 4 },
  empty: { alignItems: "center", padding: 32, backgroundColor: theme.color.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: theme.color.border, gap: 8 },
  emptyTitle: { color: theme.color.onSurface, fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptySub: { color: theme.color.onSurfaceSecondary, textAlign: "center", fontSize: 13 },
  cta: { marginTop: 14, backgroundColor: theme.color.brand, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  ctaText: { color: theme.color.onBrandPrimary, fontWeight: "800" },
  card: { flexDirection: "row", backgroundColor: theme.color.surfaceSecondary, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: theme.color.border },
  thumb: { width: 110, height: 110 },
  cardCat: { color: theme.color.brand, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  cardTitle: { color: theme.color.onSurface, fontSize: 15, fontWeight: "700", marginTop: 2 },
  cardMeta: { color: theme.color.onSurfaceTertiary, fontSize: 11 },
  barWrap: { height: 5, backgroundColor: theme.color.surfaceTertiary, borderRadius: 999, marginTop: 10, overflow: "hidden" },
  bar: { height: 5, backgroundColor: theme.color.brand, borderRadius: 999 },
  certPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.color.brand, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  certPillText: { color: theme.color.onBrandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  sectionH: { color: theme.color.onSurface, fontSize: 17, fontWeight: "700", paddingHorizontal: 20, marginTop: 26, marginBottom: 12 },
  liveCard: { backgroundColor: theme.color.surfaceSecondary, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: theme.color.border },
  livePill: { alignSelf: "flex-start", backgroundColor: theme.color.brandSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 6 },
  livePillText: { color: theme.color.brand, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
});
