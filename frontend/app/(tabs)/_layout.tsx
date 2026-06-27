import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, View } from "react-native";
import { BlurView } from "expo-blur";
import { theme } from "@/src/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.brand,
        tabBarInactiveTintColor: theme.color.onSurfaceTertiary,
        tabBarStyle: {
          backgroundColor: theme.color.surfaceSecondary,
          borderTopColor: theme.color.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarBackground: Platform.OS === "ios"
          ? () => <BlurView intensity={60} tint="dark" style={{ flex: 1 }} />
          : undefined,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="learning" options={{ title: "Learn", tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} /> }} />
      <Tabs.Screen name="quiz" options={{ title: "Quiz", tabBarIcon: ({ color, size }) => <Feather name="zap" size={size} color={color} /> }} />
      <Tabs.Screen name="notes" options={{ title: "Notes", tabBarIcon: ({ color, size }) => <Feather name="edit-3" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
    </Tabs>
  );
}
