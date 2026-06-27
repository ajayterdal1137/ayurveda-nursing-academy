import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "@/src/lib/theme";

export function ScreenshotToast({ visible, onHide }: { visible: boolean; onHide: () => void }) {
  const [op] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(op, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => onHide());
    }, 2400);
    return () => clearTimeout(t);
  }, [visible, op, onHide]);

  if (!visible) return null;
  return (
    <Animated.View style={[styles.wrap, { opacity: op }]} pointerEvents="none">
      <View style={styles.toast}>
        <Feather name="shield" size={18} color={theme.color.brand} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Screenshot detected</Text>
          <Text style={styles.body}>Course content is copyright-protected.</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 80, left: 16, right: 16, alignItems: "center", zIndex: 9999 },
  toast: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1.5, borderColor: theme.color.brand, maxWidth: 360 },
  title: { color: theme.color.onSurface, fontWeight: "800", fontSize: 13 },
  body: { color: theme.color.onSurfaceSecondary, fontSize: 11, marginTop: 2 },
});
