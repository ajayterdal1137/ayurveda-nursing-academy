import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Share } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

type Wallet = {
  balance: number;
  referral_code: string;
  referral_bonus: number;
  invited_count: number;
  transactions: { id: string; amount: number; kind: string; note: string; created_at: string }[];
};

const APP_URL = "https://ayurveda-learn-2.preview.emergentagent.com";

export default function Referral() {
  const router = useRouter();
  const [w, setW] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try { setW(await api<Wallet>("/wallet")); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !w) return <View style={[styles.center]}><ActivityIndicator color={theme.color.brand} /></View>;

  const inviteMsg = `🪔 Join me on Ayurveda Nursing Academy!\n\nLearn ancient Ayurvedic wisdom from expert instructors. Use my code *${w.referral_code}* on sign up and we both get ₹${w.referral_bonus} wallet credit!\n\n${APP_URL}`;

  const shareWhatsApp = async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(inviteMsg)}`;
    const fallback = `https://wa.me/?text=${encodeURIComponent(inviteMsg)}`;
    try {
      const can = await Linking.canOpenURL(url);
      await Linking.openURL(can ? url : fallback);
    } catch {
      Linking.openURL(fallback);
    }
  };

  const shareNative = async () => {
    try {
      if (Platform.OS === "web" && (navigator as any).share) {
        await (navigator as any).share({ title: "Ayurveda Nursing Academy", text: inviteMsg, url: APP_URL });
      } else if (Platform.OS !== "web") {
        await Share.share({ message: inviteMsg });
      } else {
        await Clipboard.setStringAsync(inviteMsg);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(w.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="ref-back"><Feather name="chevron-left" size={22} color={theme.color.onSurface} /></Pressable>
        <Text style={{ color: theme.color.onSurface, fontSize: 18, fontWeight: "800", flex: 1 }}>Refer & Earn</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[theme.color.brandSecondary, theme.color.surfaceSecondary]} style={styles.heroCard}>
          <View style={styles.giftIcon}><Feather name="gift" size={28} color={theme.color.onBrandPrimary} /></View>
          <Text style={styles.heroTitle}>Earn ₹{w.referral_bonus} for every friend</Text>
          <Text style={styles.heroSub}>Both of you get ₹{w.referral_bonus} wallet credit when they sign up using your code.</Text>
        </LinearGradient>

        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>Wallet balance</Text>
            <Text style={styles.balanceValue}>₹{w.balance}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{w.invited_count}</Text>
            <Text style={styles.statLabel}>Friends invited</Text>
          </View>
        </View>

        <Text style={styles.section}>Your referral code</Text>
        <Pressable onPress={copyCode} testID="copy-code" style={styles.codeBox}>
          <Text style={styles.code}>{w.referral_code}</Text>
          <View style={styles.copyBtn}>
            <Feather name={copied ? "check" : "copy"} size={14} color={theme.color.onBrandPrimary} />
            <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
          </View>
        </Pressable>

        <View style={{ gap: 10, marginTop: 18 }}>
          <Pressable testID="share-whatsapp" onPress={shareWhatsApp} style={[styles.shareBtn, { backgroundColor: "#25D366" }]}>
            <Feather name="message-circle" size={18} color="#FFFFFF" />
            <Text style={[styles.shareText, { color: "#FFFFFF" }]}>Share on WhatsApp</Text>
          </Pressable>
          <Pressable testID="share-native" onPress={shareNative} style={styles.shareBtnOutline}>
            <Feather name="share-2" size={18} color={theme.color.brand} />
            <Text style={[styles.shareText, { color: theme.color.brand }]}>Share via other apps</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>How it works</Text>
        <View style={styles.steps}>
          {[
            { i: "1", t: "Share your code", d: "Send your referral code to friends on WhatsApp or any app." },
            { i: "2", t: "They sign up", d: "Friend enters your code while creating their account." },
            { i: "3", t: "Both earn ₹100", d: "Instant wallet credit. Use it on any course at checkout." },
          ].map(s => (
            <View key={s.i} style={styles.step}>
              <View style={styles.stepNum}><Text style={{ color: theme.color.brand, fontWeight: "800" }}>{s.i}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.t}</Text>
                <Text style={styles.stepDesc}>{s.d}</Text>
              </View>
            </View>
          ))}
        </View>

        {w.transactions.length > 0 && (
          <>
            <Text style={styles.section}>Wallet history</Text>
            <View style={{ gap: 8 }}>
              {w.transactions.map(t => {
                const credit = t.amount > 0;
                return (
                  <View key={t.id} style={styles.txn}>
                    <View style={[styles.txnIcon, { backgroundColor: credit ? "rgba(62,142,65,0.15)" : "rgba(158,60,60,0.15)" }]}>
                      <Feather name={credit ? "arrow-down-left" : "arrow-up-right"} size={14} color={credit ? theme.color.success : theme.color.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnNote} numberOfLines={1}>{t.note}</Text>
                      <Text style={styles.txnDate}>{new Date(t.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={[styles.txnAmount, { color: credit ? theme.color.success : theme.color.error }]}>{credit ? "+" : ""}₹{t.amount}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  center: { flex: 1, backgroundColor: theme.color.surface, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heroCard: { padding: 22, borderRadius: 20, alignItems: "center", borderWidth: 1, borderColor: theme.color.border, gap: 8 },
  giftIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.color.brand, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroTitle: { color: theme.color.onSurface, fontSize: 22, fontWeight: "800", textAlign: "center" },
  heroSub: { color: theme.color.onSurfaceSecondary, fontSize: 13, textAlign: "center", lineHeight: 19 },
  balanceCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, backgroundColor: theme.color.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: theme.color.border, marginTop: 16 },
  balanceLabel: { color: theme.color.onSurfaceTertiary, fontSize: 11, letterSpacing: 0.5 },
  balanceValue: { color: theme.color.brand, fontSize: 32, fontWeight: "800", marginTop: 4 },
  statBox: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderLeftWidth: 1, borderColor: theme.color.border },
  statValue: { color: theme.color.onSurface, fontSize: 24, fontWeight: "800" },
  statLabel: { color: theme.color.onSurfaceTertiary, fontSize: 10, marginTop: 2 },
  section: { color: theme.color.onSurface, fontSize: 16, fontWeight: "700", marginTop: 22, marginBottom: 10 },
  codeBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1.5, borderColor: theme.color.brand, borderStyle: "dashed" as any },
  code: { color: theme.color.brand, fontSize: 22, fontWeight: "800", letterSpacing: 3 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.color.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  copyText: { color: theme.color.onBrandPrimary, fontWeight: "800", fontSize: 12 },
  shareBtn: { flexDirection: "row", gap: 10, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  shareBtnOutline: { flexDirection: "row", gap: 10, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: theme.color.brand, backgroundColor: theme.color.surfaceSecondary },
  shareText: { fontWeight: "800", fontSize: 14 },
  steps: { gap: 10 },
  step: { flexDirection: "row", gap: 12, padding: 14, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.color.brandSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.color.brand },
  stepTitle: { color: theme.color.onSurface, fontWeight: "700", fontSize: 14 },
  stepDesc: { color: theme.color.onSurfaceSecondary, fontSize: 12, marginTop: 2 },
  txn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: theme.color.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: theme.color.border },
  txnIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  txnNote: { color: theme.color.onSurface, fontSize: 13 },
  txnDate: { color: theme.color.onSurfaceTertiary, fontSize: 10, marginTop: 2 },
  txnAmount: { fontWeight: "800", fontSize: 14 },
});
