import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { useScreenshotProtection } from "@/src/hooks/useScreenshotProtection";
import { ScreenshotToast } from "@/src/components/ScreenshotToast";

export default function LessonPlayer() {
  const router = useRouter();
  const { id, courseId, type, url, title } = useLocalSearchParams<{ id: string; courseId: string; type: string; url: string; title: string }>();
  const [shotVisible, setShotVisible] = React.useState(false);
  useScreenshotProtection(() => setShotVisible(true));

  const viewerUrl =
    type === "pdf" || type === "word"
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(url || "")}&embedded=true`
      : url || "";

  const markComplete = async () => {
    try {
      await api("/progress/mark-complete", { method: "POST", body: { course_id: courseId, lesson_id: id } });
    } catch {}
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.surface }}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Pressable testID="lesson-back" onPress={() => router.back()} style={styles.iconBtn}><Feather name="chevron-left" size={22} color={theme.color.onSurface} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.kind}>{String(type).toUpperCase()} LESSON</Text>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        {Platform.OS === "web" ? (
          <iframe src={viewerUrl} style={{ width: "100%", height: "100%", border: "0" } as any} allow="autoplay; encrypted-media" />
        ) : (
          <WebView
            source={{ uri: viewerUrl }}
            style={{ flex: 1, backgroundColor: theme.color.surface }}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
          />
        )}
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <Pressable testID="mark-complete" onPress={markComplete} style={styles.cta}>
          <Feather name="check-circle" size={18} color={theme.color.onBrandPrimary} />
          <Text style={styles.ctaText}>Mark as Complete</Text>
        </Pressable>
      </SafeAreaView>
      <ScreenshotToast visible={shotVisible} onHide={() => setShotVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, backgroundColor: theme.color.surfaceSecondary, gap: 8, borderBottomWidth: 1, borderColor: theme.color.border },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  kind: { color: theme.color.brand, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: theme.color.onSurface, fontSize: 14, fontWeight: "700" },
  footer: { backgroundColor: theme.color.surfaceSecondary, borderTopWidth: 1, borderColor: theme.color.border, padding: 12 },
  cta: { flexDirection: "row", gap: 8, height: 50, backgroundColor: theme.color.brand, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  ctaText: { color: theme.color.onBrandPrimary, fontWeight: "800" },
});
