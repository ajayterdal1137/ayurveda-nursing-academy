import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

type Note = { id: string; title: string; body: string; color: string; created_at: string };
const COLORS = ["#2B3B31", "#3A4F41", "#4A6B56", "#1E2620", "#9E3C3C"];

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const load = useCallback(async () => {
    try { setNotes(await api<Note[]>("/notes")); } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!title.trim()) return;
    await api("/notes", { method: "POST", body: { title, body, color } });
    setOpen(false); setTitle(""); setBody(""); setColor(COLORS[0]);
    load();
  };

  const remove = async (id: string) => {
    await api(`/notes/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notes</Text>
          <Text style={styles.sub}>Capture your insights</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {notes.length === 0 && (
          <View style={styles.empty}>
            <Feather name="edit-3" size={32} color={theme.color.brand} />
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptySub}>Tap the + button to add your first insight.</Text>
          </View>
        )}
        {notes.map(n => (
          <View key={n.id} testID={`note-${n.id}`} style={[styles.note, { backgroundColor: n.color || theme.color.brandSecondary }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text style={styles.nTitle}>{n.title}</Text>
              <Pressable onPress={() => remove(n.id)} testID={`delete-note-${n.id}`} hitSlop={10}>
                <Feather name="trash-2" size={16} color={theme.color.onSurfaceSecondary} />
              </Pressable>
            </View>
            <Text style={styles.nBody}>{n.body}</Text>
            <Text style={styles.nDate}>{new Date(n.created_at).toLocaleDateString()}</Text>
          </View>
        ))}
      </ScrollView>

      <Pressable testID="add-note-fab" style={styles.fab} onPress={() => setOpen(true)}>
        <Feather name="plus" size={26} color={theme.color.onBrandPrimary} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
          <View style={styles.modal}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ color: theme.color.onSurface, fontSize: 18, fontWeight: "700" }}>New note</Text>
              <Pressable onPress={() => setOpen(false)} testID="close-note-modal"><Feather name="x" size={22} color={theme.color.onSurface} /></Pressable>
            </View>
            <TextInput testID="note-title-input" placeholder="Title" placeholderTextColor={theme.color.onSurfaceTertiary} value={title} onChangeText={setTitle} style={styles.input} />
            <TextInput testID="note-body-input" placeholder="Write something..." placeholderTextColor={theme.color.onSurfaceTertiary} value={body} onChangeText={setBody} multiline style={[styles.input, { height: 120, textAlignVertical: "top" }]} />
            <View style={{ flexDirection: "row", gap: 10, marginVertical: 14 }}>
              {COLORS.map(c => (
                <Pressable key={c} onPress={() => setColor(c)} style={[styles.swatch, { backgroundColor: c }, color === c && { borderColor: theme.color.brand, borderWidth: 2 }]} />
              ))}
            </View>
            <Pressable testID="save-note" onPress={save} style={styles.saveBtn}>
              <Text style={{ color: theme.color.onBrandPrimary, fontWeight: "800" }}>Save Note</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { color: theme.color.onSurface, fontSize: 26, fontWeight: "800" },
  sub: { color: theme.color.onSurfaceSecondary, marginTop: 4 },
  empty: { alignItems: "center", padding: 32, backgroundColor: theme.color.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: theme.color.border, gap: 8 },
  emptyTitle: { color: theme.color.onSurface, fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptySub: { color: theme.color.onSurfaceSecondary, textAlign: "center", fontSize: 13 },
  note: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.color.border },
  nTitle: { color: theme.color.onSurface, fontSize: 16, fontWeight: "700", flex: 1 },
  nBody: { color: theme.color.onSurfaceSecondary, marginTop: 8, fontSize: 13, lineHeight: 19 },
  nDate: { color: theme.color.onSurfaceTertiary, fontSize: 10, marginTop: 12 },
  fab: { position: "absolute", right: 20, bottom: 90, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.color.brand, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modal: { backgroundColor: theme.color.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderTopWidth: 1, borderColor: theme.color.border },
  input: { backgroundColor: theme.color.surfaceTertiary, borderRadius: 12, color: theme.color.onSurface, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.color.border, fontSize: 14 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.color.border },
  saveBtn: { backgroundColor: theme.color.brand, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
