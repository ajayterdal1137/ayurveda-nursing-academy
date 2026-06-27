import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/src/lib/theme";
import { useAuth } from "@/src/lib/auth";
import { LogoWordmark } from "@/src/components/Logo";

const ROLES: { key: "student" | "teacher" | "admin"; label: string; icon: any }[] = [
  { key: "student", label: "Student", icon: "user" },
  { key: "teacher", label: "Teacher", icon: "book-open" },
  { key: "admin", label: "Admin", icon: "shield" },
];

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !email || !password) { setErr("All fields required"); return; }
    setErr(null);
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, role, referral.trim() || undefined);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[theme.color.surface, "#0F1612", theme.color.surfaceSecondary]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: "center", marginTop: 24 }}>
              <LogoWordmark />
            </View>

            <View style={styles.card}>
              <Text style={styles.h1}>Create account</Text>
              <Text style={styles.sub}>Join the academy</Text>

              <View style={styles.roles}>
                {ROLES.map((r) => {
                  const active = role === r.key;
                  return (
                    <Pressable
                      key={r.key}
                      testID={`role-${r.key}`}
                      onPress={() => setRole(r.key)}
                      style={[styles.role, active && styles.roleActive]}
                    >
                      <Feather name={r.icon} size={16} color={active ? theme.color.onBrandPrimary : theme.color.brand} />
                      <Text style={[styles.roleText, active && { color: theme.color.onBrandPrimary, fontWeight: "800" }]}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.field}>
                <Feather name="user" size={16} color={theme.color.brand} />
                <TextInput testID="register-name-input" style={styles.input} placeholder="Full name" placeholderTextColor={theme.color.onSurfaceTertiary} value={name} onChangeText={setName} />
              </View>
              <View style={styles.field}>
                <Feather name="mail" size={16} color={theme.color.brand} />
                <TextInput testID="register-email-input" style={styles.input} placeholder="Email" placeholderTextColor={theme.color.onSurfaceTertiary} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              </View>
              <View style={styles.field}>
                <Feather name="lock" size={16} color={theme.color.brand} />
                <TextInput testID="register-password-input" style={styles.input} placeholder="Password (min 6)" placeholderTextColor={theme.color.onSurfaceTertiary} secureTextEntry value={password} onChangeText={setPassword} />
              </View>
              <View style={[styles.field, { borderColor: theme.color.brand, borderStyle: "dashed" as any }]}>
                <Feather name="gift" size={16} color={theme.color.brand} />
                <TextInput testID="register-referral-input" style={styles.input} placeholder="Referral code (optional) — earn ₹100" placeholderTextColor={theme.color.onSurfaceTertiary} autoCapitalize="characters" value={referral} onChangeText={setReferral} />
              </View>

              {err && <Text style={styles.err}>{err}</Text>}

              <Pressable testID="register-submit-button" onPress={submit} disabled={loading} style={styles.cta}>
                {loading ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : <Text style={styles.ctaText}>Create Account</Text>}
              </Pressable>

              <Pressable testID="goto-login" onPress={() => router.push("/(auth)/login")} style={{ marginTop: 18, alignItems: "center" }}>
                <Text style={{ color: theme.color.onSurfaceSecondary }}>
                  Already a member? <Text style={{ color: theme.color.brand, fontWeight: "700" }}>Sign in</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: theme.spacing.xl, paddingBottom: 48 },
  card: {
    marginTop: 24, backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.lg, padding: theme.spacing.xl,
  },
  h1: { color: theme.color.onSurface, fontSize: 26, fontWeight: "700" },
  sub: { color: theme.color.onSurfaceSecondary, marginTop: 6, marginBottom: 16 },
  roles: { flexDirection: "row", gap: 8, marginBottom: 14 },
  role: {
    flex: 1, height: 44, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceTertiary, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 6,
  },
  roleActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  roleText: { color: theme.color.onSurface, fontSize: 13, fontWeight: "600" },
  field: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: theme.color.surfaceTertiary, borderRadius: theme.radius.md,
    paddingHorizontal: 14, height: 52, marginBottom: 12, borderWidth: 1, borderColor: theme.color.border,
  },
  input: { flex: 1, color: theme.color.onSurface, fontSize: 15 },
  err: { color: theme.color.error, marginBottom: 8 },
  cta: {
    backgroundColor: theme.color.brand, height: 54, borderRadius: theme.radius.md,
    alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  ctaText: { color: theme.color.onBrandPrimary, fontSize: 16, fontWeight: "800" },
});
