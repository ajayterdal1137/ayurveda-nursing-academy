import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";

type Gateway = "razorpay" | "stripe";

const METHODS: { key: Gateway; name: string; tag: string; icon: any; currency: "INR" | "USD"; methods: string[] }[] = [
  { key: "razorpay", name: "Razorpay", tag: "Recommended for India", icon: "smartphone", currency: "INR", methods: ["UPI", "Cards", "NetBanking", "Wallets"] },
  { key: "stripe", name: "Stripe", tag: "International cards", icon: "credit-card", currency: "USD", methods: ["Visa", "Mastercard", "Amex"] },
];

export default function Checkout() {
  const router = useRouter();
  const { user } = useAuth();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [course, setCourse] = useState<any>(null);
  const [support, setSupport] = useState<any>(null);
  const [gateway, setGateway] = useState<Gateway>("razorpay");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [wallet, setWallet] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    api(`/courses/${courseId}`).then(setCourse).catch(() => {});
    api<{ balance: number }>("/wallet").then(w => setWallet(w.balance)).catch(() => {});
    api("/support/info").then(setSupport).catch(() => {});
  }, [courseId]);

  const pay = async () => {
    setProcessing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const m = METHODS.find(x => x.key === gateway)!;
      const order = await api<any>("/payments/create-order", { method: "POST", body: { course_id: courseId, gateway, currency: m.currency, apply_wallet: useWallet && m.currency === "INR" } });
      await new Promise(r => setTimeout(r, 1500));
      await api("/payments/verify", { method: "POST", body: { order_id: order.id, course_id: courseId } });
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      console.log(e);
    } finally {
      setProcessing(false);
    }
  };

  if (!course) return <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View>;

  if (success) {
    const sendWhatsApp = () => {
      const num = (support?.whatsapp || "").replace(/[^0-9]/g, "");
      const msg = `🪔 Hi! I just enrolled in *${course.title}* on Ayurveda Nursing Academy.\n\nMy name: ${user?.name || ""}\nEmail: ${user?.email || ""}\n\nCould you please help me get started?`;
      const url = num ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      Linking.openURL(url).catch(() => {});
    };
    const joinChannel = () => {
      if (support?.whatsapp_channel) Linking.openURL(support.whatsapp_channel).catch(() => {});
    };

    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.color.surface, padding: 20 }]}>
        <ScrollView contentContainerStyle={{ paddingVertical: 20 }} showsVerticalScrollIndicator={false}>
          <View style={styles.successCard}>
            <View style={styles.tickWrap}><Feather name="check" size={42} color={theme.color.onBrandPrimary} /></View>
            <Text style={styles.successTitle}>Payment Successful</Text>
            <Text style={styles.successSub}>Welcome to</Text>
            <Text style={styles.successCourse}>{course.title}</Text>

            <View style={styles.welcomeBox}>
              <Text style={styles.welcomeTitle}>🎉 Get started in 3 steps</Text>
              <Text style={styles.welcomeStep}>1. Tap "Start Learning" to begin your first lesson</Text>
              <Text style={styles.welcomeStep}>2. Join our WhatsApp Channel for updates & live class alerts</Text>
              <Text style={styles.welcomeStep}>3. Message us anytime if you need help</Text>
            </View>

            <Pressable testID="goto-course" onPress={() => router.replace(`/course/${courseId}`)} style={styles.cta}>
              <Feather name="play-circle" size={18} color={theme.color.onBrandPrimary} />
              <Text style={styles.ctaText}>Start Learning</Text>
            </Pressable>

            {support?.whatsapp_channel && (
              <Pressable testID="join-whatsapp-channel" onPress={joinChannel} style={[styles.successBtn, { backgroundColor: "#128C7E" }]}>
                <Feather name="radio" size={18} color="#FFFFFF" />
                <Text style={[styles.successBtnText, { color: "#FFFFFF" }]}>Join WhatsApp Channel</Text>
              </Pressable>
            )}

            <Pressable testID="message-whatsapp-support" onPress={sendWhatsApp} style={[styles.successBtn, { backgroundColor: "#25D366" }]}>
              <Feather name="message-circle" size={18} color="#FFFFFF" />
              <Text style={[styles.successBtnText, { color: "#FFFFFF" }]}>Message us on WhatsApp</Text>
            </Pressable>

            <Text style={styles.bonusText}>💡 Tip: A certificate with your name will be issued when you complete all lessons.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const selected = METHODS.find(m => m.key === gateway)!;
  const basePrice = selected.currency === "INR" ? course.price_inr : course.price_usd;
  const walletApplicable = selected.currency === "INR" && useWallet ? Math.min(wallet, basePrice) : 0;
  const finalPrice = basePrice - walletApplicable;
  const amount = selected.currency === "INR" ? `₹${finalPrice}` : `$${finalPrice}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.surface }}>
      <SafeAreaView edges={["top"]} style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable testID="checkout-back" onPress={() => router.back()} style={styles.iconBtn}><Feather name="chevron-left" size={22} color={theme.color.onSurface} /></Pressable>
        <Text style={{ color: theme.color.onSurface, fontSize: 18, fontWeight: "800" }}>Checkout</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 160 }}>
        <LinearGradient colors={[theme.color.brandSecondary, theme.color.surfaceSecondary]} style={styles.summary}>
          <Image source={{ uri: course.thumbnail }} style={{ width: 84, height: 84, borderRadius: 12 }} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.sumCat}>{course.category}</Text>
            <Text style={styles.sumTitle} numberOfLines={2}>{course.title}</Text>
            <Text style={styles.sumIns}>{course.instructor}</Text>
          </View>
        </LinearGradient>

        <View>
          <Text style={styles.section}>Payment method</Text>
          <View style={{ gap: 10 }}>
            {METHODS.map(m => {
              const active = m.key === gateway;
              return (
                <Pressable key={m.key} testID={`gateway-${m.key}`} onPress={() => setGateway(m.key)} style={[styles.method, active && styles.methodActive]}>
                  <View style={[styles.mIcon, active && { backgroundColor: theme.color.brand }]}>
                    <Feather name={m.icon} size={18} color={active ? theme.color.onBrandPrimary : theme.color.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mName}>{m.name}</Text>
                    <Text style={styles.mTag}>{m.tag}</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {m.methods.map(x => <Text key={x} style={styles.methodPill}>{x}</Text>)}
                    </View>
                  </View>
                  <View style={[styles.radio, active && { borderColor: theme.color.brand }]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalL}>Total</Text>
          <View style={{ alignItems: "flex-end" }}>
            {walletApplicable > 0 && <Text style={{ color: theme.color.onSurfaceTertiary, fontSize: 12, textDecorationLine: "line-through" }}>{selected.currency === "INR" ? `₹${basePrice}` : `$${basePrice}`}</Text>}
            <Text style={styles.totalV}>{amount}</Text>
          </View>
        </View>

        {selected.currency === "INR" && wallet > 0 && (
          <Pressable testID="apply-wallet" onPress={() => setUseWallet(!useWallet)} style={[styles.walletRow, useWallet && { borderColor: theme.color.brand }]}>
            <View style={[styles.walletIcon, useWallet && { backgroundColor: theme.color.brand }]}>
              <Feather name="gift" size={16} color={useWallet ? theme.color.onBrandPrimary : theme.color.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.walletTitle}>Apply wallet credit</Text>
              <Text style={styles.walletSub}>You have ₹{wallet} {useWallet && walletApplicable > 0 ? `· -₹${walletApplicable} applied` : ""}</Text>
            </View>
            <View style={[styles.toggle, useWallet && styles.toggleOn]}>
              <View style={[styles.toggleDot, useWallet && { alignSelf: "flex-end", backgroundColor: theme.color.onBrandPrimary }]} />
            </View>
          </Pressable>
        )}

        <Text style={styles.disclaimer}>This is a demo checkout — actual payment is simulated. In production, real Razorpay/Stripe SDK will be used.</Text>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.payBar}>
        <Pressable testID="pay-now" onPress={pay} disabled={processing} style={[styles.payBtn, processing && { opacity: 0.7 }]}>
          {processing ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : (
            <>
              <Feather name="lock" size={16} color={theme.color.onBrandPrimary} />
              <Text style={styles.payBtnText}>Pay {amount} via {selected.name}</Text>
            </>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.color.surface },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  summary: { flexDirection: "row", gap: 14, padding: 14, borderRadius: 20, alignItems: "center", borderWidth: 1, borderColor: theme.color.border },
  sumCat: { color: theme.color.brand, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  sumTitle: { color: theme.color.onSurface, fontSize: 15, fontWeight: "700", marginTop: 2 },
  sumIns: { color: theme.color.onSurfaceTertiary, fontSize: 12, marginTop: 4 },
  section: { color: theme.color.onSurface, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  method: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1.5, borderColor: theme.color.border },
  methodActive: { borderColor: theme.color.brand },
  mIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.color.brandSecondary, alignItems: "center", justifyContent: "center" },
  mName: { color: theme.color.onSurface, fontWeight: "700", fontSize: 15 },
  mTag: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  methodPill: { color: theme.color.onSurfaceSecondary, fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: theme.color.surfaceTertiary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.color.borderStrong, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.color.brand },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border },
  totalL: { color: theme.color.onSurfaceSecondary, fontSize: 14 },
  totalV: { color: theme.color.brand, fontSize: 22, fontWeight: "800" },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1.5, borderColor: theme.color.border },
  walletIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.color.brandSecondary, alignItems: "center", justifyContent: "center" },
  walletTitle: { color: theme.color.onSurface, fontWeight: "700", fontSize: 14 },
  walletSub: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  toggle: { width: 40, height: 22, borderRadius: 999, backgroundColor: theme.color.surfaceTertiary, padding: 2, justifyContent: "center" },
  toggleOn: { backgroundColor: theme.color.brand },
  toggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.color.onSurface },
  disclaimer: { color: theme.color.onSurfaceTertiary, fontSize: 11, lineHeight: 16, fontStyle: "italic" },
  payBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: theme.color.surfaceSecondary, borderTopWidth: 1, borderColor: theme.color.border },
  payBtn: { flexDirection: "row", gap: 8, height: 54, backgroundColor: theme.color.brand, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  payBtnText: { color: theme.color.onBrandPrimary, fontWeight: "800", fontSize: 15 },
  successCard: { alignItems: "center", padding: 28, gap: 6, backgroundColor: theme.color.surfaceSecondary, borderRadius: 24, borderWidth: 1, borderColor: theme.color.border, width: "100%" },
  tickWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: theme.color.brand, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  successTitle: { color: theme.color.onSurface, fontSize: 22, fontWeight: "800" },
  successSub: { color: theme.color.onSurfaceSecondary, marginTop: 4 },
  successCourse: { color: theme.color.brand, fontSize: 16, fontWeight: "700", marginTop: 4, textAlign: "center" },
  welcomeBox: { width: "100%", padding: 16, borderRadius: 14, backgroundColor: theme.color.surfaceTertiary, borderWidth: 1, borderColor: theme.color.border, marginTop: 18, gap: 6 },
  welcomeTitle: { color: theme.color.brand, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  welcomeStep: { color: theme.color.onSurfaceSecondary, fontSize: 12, lineHeight: 18 },
  cta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, backgroundColor: theme.color.brand, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 14, width: "100%", justifyContent: "center" },
  ctaText: { color: theme.color.onBrandPrimary, fontWeight: "800", fontSize: 15 },
  successBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14, width: "100%" },
  successBtnText: { fontWeight: "800", fontSize: 14 },
  bonusText: { color: theme.color.onSurfaceTertiary, fontSize: 11, textAlign: "center", marginTop: 16, fontStyle: "italic" },
});
