import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/lib/auth";
import { theme } from "@/src/lib/theme";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/(tabs)/home");
    else router.replace("/(auth)/login");
  }, [user, loading, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.surface, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={theme.color.brand} />
    </View>
  );
}
