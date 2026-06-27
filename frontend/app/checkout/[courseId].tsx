import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

type Gateway = "razorpay" | "stripe";

const METHODS: { key: Gateway; name: string; tag: string; icon: any; currency: "INR" | "USD"; methods: string[] }[] = [
  { key: "razorpay", name: "Razorpay", tag: "Recommended for India", icon: "smartphone", currency: "INR", methods: ["UPI", "Cards", "NetBanking", "Wallets"] },
  { key: "stripe", name: "Stripe", tag: "International cards", icon: "credit-card", currency: "USD", methods: ["Visa", "Mastercard", "Amex"] },
];

export default function Checkout() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [course, setCourse] = useState<any>(null);
  const [gateway, setGateway] = useState<Gateway>("razorpay");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api(`/courses/${courseId}`).then(setCourse).catch(() => {});
  }, [courseId]);

  const pay = async () => {
    setProcessing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const m = METHODS.find(x => x.key === gateway)!;
      const order = await api<any>("/payments/create-order", { method: "POST", body: { course_id: courseId, gateway, currency: m.currency } });
      // Simulate gateway redirect / processing (MOCKED for MVP)
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
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.color.surface, padding: 24 }]}>
        <View style={styles.successCard}>
          <View style={styles.tickWrap}><Feather name="check" size={42} color={theme.color.onBrandPrimary} /></View>
          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successSub}>You are now enrolled in</Text>
          <Text style={styles.successCourse}>{course.title}</Text>
          <Pressable testID="goto-course" onPress={() => router.replace(`/course/${courseId}`)} style={styles.cta}>
            <Text style={styles.ctaText}>Start Learning</Text>
            <Feather name="arrow-right" size={18} color={theme.color.onBrandPrimary} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const selected = METHODS.find(m => m.key === gateway)!;
  const amount = selected.currency === "INR" ? `₹${course.price_inr}` : `$${course.price_usd}`;

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
          <Text style={styles.totalV}>{amount}</Text>
        </View>

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
  disclaimer: { color: theme.color.onSurfaceTertiary, fontSize: 11, lineHeight: 16, fontStyle: "italic" },
  payBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: theme.color.surfaceSecondary, borderTopWidth: 1, borderColor: theme.color.border },
  payBtn: { flexDirection: "row", gap: 8, height: 54, backgroundColor: theme.color.brand, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  payBtnText: { color: theme.color.onBrandPrimary, fontWeight: "800", fontSize: 15 },
  successCard: { alignItems: "center", padding: 32, gap: 6, backgroundColor: theme.color.surfaceSecondary, borderRadius: 24, borderWidth: 1, borderColor: theme.color.border, width: "100%" },
  tickWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: theme.color.brand, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  successTitle: { color: theme.color.onSurface, fontSize: 22, fontWeight: "800" },
  successSub: { color: theme.color.onSurfaceSecondary, marginTop: 4 },
  successCourse: { color: theme.color.brand, fontSize: 16, fontWeight: "700", marginTop: 4, textAlign: "center" },
  cta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22, backgroundColor: theme.color.brand, paddingHorizontal: 26, paddingVertical: 14, borderRadius: 999 },
  ctaText: { color: theme.color.onBrandPrimary, fontWeight: "800", fontSize: 15 },
});
