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

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("student@ayurveda.academy");
  const [password, setPassword] = useState("student123");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
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
            <View style={{ alignItems: "center", marginTop: 32 }}>
              <LogoWordmark />
            </View>

            <View style={styles.card}>
              <Text style={styles.h1}>Welcome back</Text>
              <Text style={styles.sub}>Sign in to continue your learning journey</Text>

              <View style={styles.field}>
                <Feather name="mail" size={16} color={theme.color.brand} />
                <TextInput
                  testID="login-email-input"
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={theme.color.onSurfaceTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              <View style={styles.field}>
                <Feather name="lock" size={16} color={theme.color.brand} />
                <TextInput
                  testID="login-password-input"
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={theme.color.onSurfaceTertiary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {err && <Text style={styles.err}>{err}</Text>}

              <Pressable testID="login-submit-button" onPress={submit} disabled={loading} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
                {loading ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : <Text style={styles.ctaText}>Sign In</Text>}
              </Pressable>

              <Pressable testID="goto-register" onPress={() => router.push("/(auth)/register")} style={{ marginTop: 18, alignItems: "center" }}>
                <Text style={styles.link}>
                  New here? <Text style={{ color: theme.color.brand, fontWeight: "700" }}>Create account</Text>
                </Text>
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.line} />
              </View>

              <Pressable testID="login-google-button" onPress={() => setErr("Google sign-in coming soon — use email login")} style={styles.googleBtn}>
                <Feather name="chrome" size={18} color={theme.color.onSurface} />
                <Text style={styles.googleText}>Continue with Google</Text>
              </Pressable>

              <Text style={styles.demo}>Demo: student@ayurveda.academy / student123</Text>
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
    marginTop: 32,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
  },
  h1: { color: theme.color.onSurface, fontSize: 26, fontWeight: "700" },
  sub: { color: theme.color.onSurfaceSecondary, marginTop: 6, marginBottom: 20 },
  field: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: theme.color.surfaceTertiary,
    borderRadius: theme.radius.md, paddingHorizontal: 14, height: 52, marginBottom: 12,
    borderWidth: 1, borderColor: theme.color.border,
  },
  input: { flex: 1, color: theme.color.onSurface, fontSize: 15 },
  err: { color: theme.color.error, marginBottom: 8 },
  cta: {
    backgroundColor: theme.color.brand, height: 54, borderRadius: theme.radius.md,
    alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  ctaText: { color: theme.color.onBrandPrimary, fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  link: { color: theme.color.onSurfaceSecondary, fontSize: 14 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: theme.color.border },
  dividerText: { color: theme.color.onSurfaceTertiary, fontSize: 11, letterSpacing: 1.5 },
  googleBtn: {
    height: 50, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.borderStrong,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  googleText: { color: theme.color.onSurface, fontSize: 14, fontWeight: "600" },
  demo: { color: theme.color.onSurfaceTertiary, fontSize: 11, marginTop: 16, textAlign: "center" },
});
