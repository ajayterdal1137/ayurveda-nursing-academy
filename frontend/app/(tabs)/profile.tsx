import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/src/lib/theme";
import { useAuth } from "@/src/lib/auth";
import { useI18n, LANGS } from "@/src/lib/i18n";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);

  const isAdminOrTeacher = user?.role === "admin" || user?.role === "teacher";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[theme.color.brandSecondary, theme.color.surface]} style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.rolePill}>
            <Feather name="award" size={12} color={theme.color.onBrandPrimary} />
            <Text style={styles.rolePillText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </LinearGradient>

        <View style={{ marginTop: 24, paddingHorizontal: 16, gap: 8 }}>
          {isAdminOrTeacher && (
            <Pressable testID="goto-admin" onPress={() => router.push("/admin")} style={[styles.row, { borderColor: theme.color.brand }]}>
              <View style={[styles.rowIcon, { backgroundColor: theme.color.brand }]}><Feather name="shield" size={16} color={theme.color.onBrandPrimary} /></View>
              <Text style={styles.rowLabel}>{t("profile.admin")}</Text>
              <Feather name="chevron-right" size={18} color={theme.color.onSurfaceTertiary} />
            </Pressable>
          )}

          <Pressable testID="goto-referral" onPress={() => router.push("/referral")} style={[styles.row, { borderColor: theme.color.brand }]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.color.brand }]}><Feather name="gift" size={16} color={theme.color.onBrandPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Refer & Earn ₹100</Text>
              <Text style={styles.rowSub}>Invite friends, both get wallet credit</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.color.onSurfaceTertiary} />
          </Pressable>

          <Pressable testID="goto-learning-certs" onPress={() => router.push("/(tabs)/learning")} style={styles.row}>
            <View style={styles.rowIcon}><Feather name="award" size={16} color={theme.color.brand} /></View>
            <Text style={styles.rowLabel}>{t("profile.certificates")}</Text>
            <Feather name="chevron-right" size={18} color={theme.color.onSurfaceTertiary} />
          </Pressable>

          <Pressable testID="open-language" onPress={() => setLangOpen(true)} style={styles.row}>
            <View style={styles.rowIcon}><Feather name="globe" size={16} color={theme.color.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t("profile.language")}</Text>
              <Text style={styles.rowSub}>{LANGS.find(l => l.code === lang)?.native}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.color.onSurfaceTertiary} />
          </Pressable>

          {["bell", "credit-card", "help-circle", "settings"].map((icon, i) => {
            const labels = ["Notifications", "Payment Methods", "Help & Support", "Settings"];
            return (
              <Pressable key={icon} testID={`profile-item-${labels[i]}`} style={styles.row}>
                <View style={styles.rowIcon}><Feather name={icon as any} size={16} color={theme.color.brand} /></View>
                <Text style={styles.rowLabel}>{labels[i]}</Text>
                <Feather name="chevron-right" size={18} color={theme.color.onSurfaceTertiary} />
              </Pressable>
            );
          })}

          <Pressable testID="logout-button" onPress={async () => { await logout(); router.replace("/(auth)/login"); }} style={[styles.row, { marginTop: 12 }]}>
            <View style={[styles.rowIcon, { backgroundColor: "#3A1F1F" }]}><Feather name="log-out" size={16} color={theme.color.error} /></View>
            <Text style={[styles.rowLabel, { color: theme.color.error }]}>{t("profile.signout")}</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Ayurveda Nursing Academy · v1.1</Text>
      </ScrollView>

      <Modal visible={langOpen} transparent animationType="slide" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setLangOpen(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={{ color: theme.color.onSurface, fontSize: 18, fontWeight: "800" }}>{t("profile.language")}</Text>
              <Pressable onPress={() => setLangOpen(false)} testID="close-lang"><Feather name="x" size={22} color={theme.color.onSurface} /></Pressable>
            </View>
            {LANGS.map(l => {
              const active = l.code === lang;
              return (
                <Pressable key={l.code} testID={`lang-${l.code}`} onPress={() => { setLang(l.code); setLangOpen(false); }} style={[styles.langRow, active && styles.langRowActive]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langNative, active && { color: theme.color.brand }]}>{l.native}</Text>
                    <Text style={styles.langLabel}>{l.label}</Text>
                  </View>
                  {active && <Feather name="check-circle" size={20} color={theme.color.brand} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  hero: { alignItems: "center", paddingVertical: 32, borderBottomWidth: 1, borderColor: theme.color.border },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: theme.color.brand, alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 3, borderColor: theme.color.surface },
  avatarText: { color: theme.color.onBrandPrimary, fontSize: 36, fontWeight: "800" },
  name: { color: theme.color.onSurface, fontSize: 22, fontWeight: "800" },
  email: { color: theme.color.onSurfaceSecondary, marginTop: 4 },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: theme.color.brand, borderRadius: 999 },
  rolePillText: { color: theme.color.onBrandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border, gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.color.brandSecondary, alignItems: "center", justifyContent: "center" },
  rowLabel: { color: theme.color.onSurface, fontSize: 14, fontWeight: "600", flex: 1 },
  rowSub: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  footer: { textAlign: "center", color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 24 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modal: { backgroundColor: theme.color.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderTopWidth: 1, borderColor: theme.color.border },
  langRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.color.border },
  langRowActive: { borderColor: theme.color.brand, backgroundColor: "rgba(197,160,89,0.08)" },
  langNative: { color: theme.color.onSurface, fontSize: 18, fontWeight: "700" },
  langLabel: { color: theme.color.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
});
