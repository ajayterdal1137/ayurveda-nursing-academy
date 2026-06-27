import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Dimensions, TextInput,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/src/lib/theme";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/lib/api";
import { useI18n } from "@/src/lib/i18n";

const W = Dimensions.get("window").width;

type Course = {
  id: string; title: string; subtitle: string; category: string; thumbnail: string;
  price_inr: number; price_usd: number; rating: number; duration: string; featured: boolean;
  students_count: number; instructor: string;
};

export default function Home() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [cats, setCats] = useState<string[]>(["All"]);
  const [active, setActive] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (active !== "All") params.set("category", active);
      if (search.trim()) params.set("q", search.trim());
      const qs = params.toString();
      const [c, cat] = await Promise.all([
        api<Course[]>(`/courses${qs ? `?${qs}` : ""}`),
        api<string[]>(`/categories`),
      ]);
      setCourses(c);
      setCats(cat);
    } catch (e) {
      console.log("load err", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [active, search]);

  useEffect(() => {
    const id = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  const featured = courses.filter(c => c.featured);
  const others = courses.filter(c => !c.featured);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl tintColor={theme.color.brand} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>{t("home.namaste")}</Text>
            <Text style={styles.name}>{user?.name || "Seeker"} 🪔</Text>
          </View>
          <Pressable testID="profile-shortcut" onPress={() => router.push("/(tabs)/profile")} style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "?").charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={theme.color.brand} />
          <TextInput
            testID="home-search-input"
            value={search}
            onChangeText={setSearch}
            placeholder={t("home.search_placeholder")}
            placeholderTextColor={theme.color.onSurfaceTertiary}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable testID="home-search-clear" onPress={() => setSearch("")} hitSlop={10}>
              <Feather name="x" size={16} color={theme.color.onSurfaceTertiary} />
            </Pressable>
          )}
        </View>

        {/* Hero */}
        <Pressable onPress={() => featured[0] && router.push(`/course/${featured[0].id}`)} style={styles.hero} testID="hero-card">
          <Image source={{ uri: "https://images.pexels.com/photos/36873193/pexels-photo-36873193.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" }} style={styles.heroBg} contentFit="cover" />
          <LinearGradient colors={["transparent", "rgba(10,13,11,0.6)", "rgba(10,13,11,0.95)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroContent}>
            <View style={styles.badge}><Text style={styles.badgeText}>FEATURED</Text></View>
            <Text style={styles.heroTitle}>The Path of{"\n"}Ayurvedic Wisdom</Text>
            <Text style={styles.heroSub}>Begin your transformation with our master courses</Text>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Explore now</Text>
              <Feather name="arrow-right" size={16} color={theme.color.onBrandPrimary} />
            </View>
          </View>
        </Pressable>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {cats.map(c => {
            const isActive = c === active;
            return (
              <Pressable key={c} testID={`chip-${c}`} onPress={() => setActive(c)} style={[styles.chip, isActive && styles.chipActive]}>
                <Text style={[styles.chipText, isActive && { color: theme.color.onBrandPrimary, fontWeight: "800" }]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? <ActivityIndicator color={theme.color.brand} style={{ marginTop: 40 }} /> : (
          <>
            {courses.length === 0 && (
              <View style={{ alignItems: "center", padding: 40 }}>
                <Feather name="search" size={28} color={theme.color.onSurfaceTertiary} />
                <Text style={{ color: theme.color.onSurfaceSecondary, marginTop: 12 }}>{t("home.no_results")}</Text>
              </View>
            )}
            {/* Featured row */}
            {!search && featured.length > 0 && (
              <>
                <SectionTitle title={t("home.featured")} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
                  {featured.map(c => (
                    <Pressable key={c.id} testID={`featured-${c.id}`} onPress={() => router.push(`/course/${c.id}`)} style={styles.fCard}>
                      <Image source={{ uri: c.thumbnail }} style={styles.fImg} contentFit="cover" />
                      <LinearGradient colors={["transparent", "rgba(10,13,11,0.95)"]} style={StyleSheet.absoluteFill} />
                      <View style={styles.fOverlay}>
                        <Text style={styles.fCat}>{c.category.toUpperCase()}</Text>
                        <Text style={styles.fTitle} numberOfLines={2}>{c.title}</Text>
                        <View style={styles.fMeta}>
                          <Feather name="star" size={12} color={theme.color.brand} />
                          <Text style={styles.fMetaText}>{c.rating} · {c.duration}</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {/* All courses */}
            {courses.length > 0 && <SectionTitle title={search ? `Results (${courses.length})` : t("home.all_courses")} />}
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {(search ? courses : others).map(c => (
                <Pressable key={c.id} testID={`course-${c.id}`} onPress={() => router.push(`/course/${c.id}`)} style={styles.row}>
                  <Image source={{ uri: c.thumbnail }} style={styles.rowImg} contentFit="cover" />
                  <View style={{ flex: 1, padding: 12 }}>
                    <Text style={styles.rowCat}>{c.category}</Text>
                    <Text style={styles.rowTitle} numberOfLines={2}>{c.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{c.instructor}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
                      <Feather name="clock" size={11} color={theme.color.onSurfaceTertiary} />
                      <Text style={styles.rowMeta}>{c.duration}</Text>
                      <Text style={[styles.rowMeta, { color: theme.color.brand, fontWeight: "800" }]}>₹{c.price_inr}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 22, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: theme.color.onSurface, fontSize: 18, fontWeight: "700" }}>{title}</Text>
      <View style={{ width: 24, height: 2, backgroundColor: theme.color.brand }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  hello: { color: theme.color.onSurfaceSecondary, fontSize: 13 },
  name: { color: theme.color.onSurface, fontSize: 22, fontWeight: "700", marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.color.brandSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.color.brand },
  avatarText: { color: theme.color.brand, fontWeight: "800" },
  hero: { marginHorizontal: 16, height: 220, borderRadius: 20, overflow: "hidden", marginBottom: 6 },
  heroBg: { ...StyleSheet.absoluteFillObject },
  heroContent: { flex: 1, padding: 18, justifyContent: "flex-end" },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: theme.color.brand, marginBottom: 10 },
  badgeText: { color: theme.color.onBrandPrimary, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  heroTitle: { color: theme.color.onSurface, fontSize: 26, fontWeight: "800", lineHeight: 30 },
  heroSub: { color: theme.color.onSurfaceSecondary, marginTop: 6, fontSize: 13 },
  heroCta: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: theme.color.brand, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, marginTop: 14 },
  heroCtaText: { color: theme.color.onBrandPrimary, fontWeight: "800" },
  chipsRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, gap: 8 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 14, paddingHorizontal: 14, height: 46, borderRadius: 14, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border },
  searchInput: { flex: 1, color: theme.color.onSurface, fontSize: 14 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: theme.color.surfaceTertiary, borderWidth: 1, borderColor: theme.color.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  chipText: { color: theme.color.onSurface, fontSize: 12, fontWeight: "600" },
  fCard: { width: W * 0.7, height: 230, borderRadius: 18, overflow: "hidden", backgroundColor: theme.color.surfaceSecondary },
  fImg: { ...StyleSheet.absoluteFillObject },
  fOverlay: { flex: 1, padding: 16, justifyContent: "flex-end" },
  fCat: { color: theme.color.brand, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  fTitle: { color: theme.color.onSurface, fontSize: 18, fontWeight: "700", marginTop: 4 },
  fMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  fMetaText: { color: theme.color.onSurfaceSecondary, fontSize: 12 },
  row: { flexDirection: "row", backgroundColor: theme.color.surfaceSecondary, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: theme.color.border },
  rowImg: { width: 110, height: 110 },
  rowCat: { color: theme.color.brand, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  rowTitle: { color: theme.color.onSurface, fontSize: 15, fontWeight: "700", marginTop: 2 },
  rowSub: { color: theme.color.onSurfaceTertiary, fontSize: 12, marginTop: 4 },
  rowMeta: { color: theme.color.onSurfaceTertiary, fontSize: 11 },
});
