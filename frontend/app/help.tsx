import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

type Support = {
  phone: string; whatsapp: string; whatsapp_channel?: string; email: string; address: string;
  website: string; instagram: string; facebook: string; youtube: string; hours: string;
};

type Ticket = {
  id: string; subject: string; category: string; description: string;
  status: "open" | "in_progress" | "resolved"; created_at: string;
  replies: { by: string; role: string; message: string; at: string }[];
};

const FAQ = [
  { section: "Courses & Learning", icon: "book-open", items: [
    { q: "How do I access a course after purchase?", a: "Once payment is confirmed, the course appears in 'My Learning'. Tap it to start. Your access lasts for the period mentioned on the course (typically 1 year)." },
    { q: "Can I download lessons for offline use?", a: "PDFs and Word documents can be saved from the viewer. Videos stream online to prevent piracy." },
    { q: "What happens when my course access expires?", a: "You'll see a 'Renew' button on the course. Re-purchase to extend access by the same period." },
    { q: "Are quizzes graded?", a: "Yes — your score is shown immediately after submission. 60% is the passing mark for most quizzes." },
  ]},
  { section: "Payments & Refunds", icon: "credit-card", items: [
    { q: "Which payment methods are accepted?", a: "Razorpay (UPI, Cards, Net Banking, Wallets) for India · Stripe (Visa, Mastercard, Amex) for international." },
    { q: "How long do refunds take?", a: "Approved refunds reach your account in 5–7 business days. Contact support within 7 days of purchase." },
    { q: "Can I use wallet credit?", a: "Yes — at checkout, toggle 'Apply wallet credit' to deduct your balance from any INR order." },
  ]},
  { section: "Certificates", icon: "award", items: [
    { q: "How do I earn a certificate?", a: "Complete 100% of the course lessons (mark each as complete). The certificate is auto-issued instantly with your name." },
    { q: "Will my name be on the certificate?", a: "Yes — exactly as you registered. Update your profile name first if needed, then complete the course." },
    { q: "How do I download / print my certificate?", a: "Open My Learning → tap the gold 'Certificate' pill → tap 'Download / Share PDF'. You can print it or share via WhatsApp/email." },
    { q: "Is the certificate copy-able / shareable?", a: "Yes — you can download unlimited copies, print, share on LinkedIn, WhatsApp, or anywhere. Each certificate has a unique verification ID." },
  ]},
  { section: "Account", icon: "user", items: [
    { q: "How do I change my password?", a: "Profile → Settings → Change password (requires current password)." },
    { q: "Can I delete my account?", a: "Yes — Profile → Settings → Delete account. This is permanent and removes all your data including certificates." },
    { q: "I forgot my password — what to do?", a: "Tap 'Forgot password' on the login screen, or contact support." },
  ]},
  { section: "Refer & Earn", icon: "gift", items: [
    { q: "How does Refer & Earn work?", a: "Share your code from Profile → Refer & Earn. Each friend who signs up using it gives both of you ₹100 wallet credit." },
    { q: "Does wallet credit expire?", a: "No — your wallet balance is yours forever and can be used at any future checkout." },
  ]},
];

export default function HelpScreen() {
  const router = useRouter();
  const [info, setInfo] = useState<Support | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tab, setTab] = useState<"faq" | "contact" | "tickets">("faq");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [i, t] = await Promise.all([api<Support>("/support/info"), api<Ticket[]>("/support/tickets")]);
      setInfo(i); setTickets(t);
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});
  const call = (n: string) => Linking.openURL(`tel:${n.replace(/\s/g, "")}`).catch(() => {});
  const whatsapp = (n: string) => Linking.openURL(`https://wa.me/${n.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi, I need help with the Ayurveda Nursing Academy app.")}`).catch(() => {});
  const email = (e: string) => Linking.openURL(`mailto:${e}?subject=${encodeURIComponent("Ayurveda Academy — Support request")}`).catch(() => {});

  const submitTicket = async () => {
    if (!subject || !desc) { setMsg("Subject and description are required"); return; }
    setSubmitting(true); setMsg(null);
    try {
      await api("/support/tickets", { method: "POST", body: { subject, category, description: desc } });
      setMsg("✓ Ticket created — we'll respond soon");
      setSubject(""); setDesc(""); setCategory("General");
      setTimeout(() => { setModalOpen(false); setMsg(null); load(); setTab("tickets"); }, 1200);
    } catch (e: any) { setMsg(e.message); }
    finally { setSubmitting(false); }
  };

  const filterFaq = () => {
    if (!search.trim()) return FAQ;
    const s = search.toLowerCase();
    return FAQ.map(sec => ({
      ...sec,
      items: sec.items.filter(it => it.q.toLowerCase().includes(s) || it.a.toLowerCase().includes(s)),
    })).filter(sec => sec.items.length > 0);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="help-back"><Feather name="chevron-left" size={22} color={theme.color.onSurface} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.sub}>{info?.hours || "Mon - Sat · 9am-7pm IST"}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(["faq", "contact", "tickets"] as const).map(k => (
          <Pressable key={k} testID={`help-tab-${k}`} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabActive]}>
            <Text style={[styles.tabText, tab === k && { color: theme.color.onBrandPrimary, fontWeight: "800" }]}>
              {k === "faq" ? "FAQ" : k === "contact" ? "Contact" : `Tickets (${tickets.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {tab === "faq" && (
            <>
              <View style={styles.searchWrap}>
                <Feather name="search" size={16} color={theme.color.brand} />
                <TextInput testID="faq-search" value={search} onChangeText={setSearch} placeholder="Search help articles..." placeholderTextColor={theme.color.onSurfaceTertiary} style={styles.searchInput} />
              </View>

              {filterFaq().map(sec => (
                <View key={sec.section} style={{ marginTop: 18 }}>
                  <View style={styles.secHead}>
                    <View style={styles.secIcon}><Feather name={sec.icon as any} size={14} color={theme.color.brand} /></View>
                    <Text style={styles.secTitle}>{sec.section}</Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    {sec.items.map((it, i) => {
                      const key = `${sec.section}-${i}`;
                      const open = expanded === key;
                      return (
                        <Pressable key={key} testID={`faq-${key}`} onPress={() => setExpanded(open ? null : key)} style={styles.faq}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={styles.faqQ}>{it.q}</Text>
                            <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={theme.color.brand} />
                          </View>
                          {open && <Text style={styles.faqA}>{it.a}</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </>
          )}

          {tab === "contact" && info && (
            <>
              <LinearGradient colors={[theme.color.brandSecondary, theme.color.surfaceSecondary]} style={styles.heroCard}>
                <View style={styles.heroIcon}><Feather name="phone-call" size={26} color={theme.color.onBrandPrimary} /></View>
                <Text style={styles.heroTitle}>We're here to help</Text>
                <Text style={styles.heroSub}>Reach us via any channel below. Average response time: under 2 hours.</Text>
              </LinearGradient>

              <View style={{ gap: 10, marginTop: 16 }}>
                <ContactRow icon="phone" label="Call us" sub={info.phone} color="#3E8E41" onPress={() => call(info.phone)} testID="contact-call" />
                <ContactRow icon="message-circle" label="WhatsApp chat" sub={info.whatsapp} color="#25D366" onPress={() => whatsapp(info.whatsapp)} testID="contact-whatsapp" />
                {info.whatsapp_channel && (
                  <ContactRow icon="radio" label="Join WhatsApp Channel" sub="Latest updates & announcements" color="#128C7E" onPress={() => openLink(info.whatsapp_channel!)} testID="contact-whatsapp-channel" />
                )}
                <ContactRow icon="mail" label="Email" sub={info.email} color="#C5A059" onPress={() => email(info.email)} testID="contact-email" />
                <ContactRow icon="map-pin" label="Visit us" sub={info.address} color="#9E3C3C" onPress={() => openLink(`https://www.google.com/maps/search/${encodeURIComponent(info.address)}`)} testID="contact-map" />
                <ContactRow icon="globe" label="Website" sub={info.website} color="#4A6B56" onPress={() => openLink(info.website)} testID="contact-web" />
              </View>

              <Text style={styles.section}>Follow us</Text>
              <View style={styles.socialRow}>
                <SocialBtn icon="instagram" url={info.instagram} testID="social-ig" />
                <SocialBtn icon="facebook" url={info.facebook} testID="social-fb" />
                <SocialBtn icon="youtube" url={info.youtube} testID="social-yt" />
              </View>

              <Pressable testID="raise-ticket-cta" onPress={() => setModalOpen(true)} style={styles.ticketCta}>
                <Feather name="edit-3" size={18} color={theme.color.onBrandPrimary} />
                <Text style={styles.ticketCtaText}>Raise a support ticket</Text>
              </Pressable>
            </>
          )}

          {tab === "tickets" && (
            <>
              <Pressable testID="raise-ticket-from-tab" onPress={() => setModalOpen(true)} style={styles.ticketCta}>
                <Feather name="plus" size={18} color={theme.color.onBrandPrimary} />
                <Text style={styles.ticketCtaText}>New ticket</Text>
              </Pressable>

              <View style={{ gap: 10, marginTop: 16 }}>
                {tickets.length === 0 && (
                  <View style={styles.empty}>
                    <Feather name="inbox" size={32} color={theme.color.brand} />
                    <Text style={styles.emptyT}>No tickets yet</Text>
                    <Text style={styles.emptyS}>Your support tickets will appear here.</Text>
                  </View>
                )}
                {tickets.map(t => (
                  <View key={t.id} style={styles.ticket} testID={`ticket-${t.id}`}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.ticketId}>{t.id}</Text>
                      <View style={[styles.statusPill, t.status === "resolved" ? { backgroundColor: theme.color.success } : t.status === "in_progress" ? { backgroundColor: theme.color.brand } : { backgroundColor: theme.color.surfaceTertiary, borderWidth: 1, borderColor: theme.color.border }]}>
                        <Text style={[styles.statusText, t.status === "open" && { color: theme.color.onSurface }]}>{t.status.replace("_", " ").toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.ticketSubject}>{t.subject}</Text>
                    <Text style={styles.ticketDesc} numberOfLines={2}>{t.description}</Text>
                    <Text style={styles.ticketDate}>{new Date(t.created_at).toLocaleString()} · {t.replies.length} {t.replies.length === 1 ? "reply" : "replies"}</Text>
                    {t.replies.length > 0 && (
                      <View style={styles.replies}>
                        {t.replies.map((r, ri) => (
                          <View key={ri} style={styles.reply}>
                            <Text style={styles.replyBy}>{r.by} · {r.role}</Text>
                            <Text style={styles.replyMsg}>{r.message}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
          <View style={styles.modal}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ color: theme.color.onSurface, fontSize: 18, fontWeight: "800" }}>Raise a ticket</Text>
              <Pressable onPress={() => setModalOpen(false)} testID="close-ticket-modal"><Feather name="x" size={22} color={theme.color.onSurface} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput testID="ticket-subject" placeholder="Subject" placeholderTextColor={theme.color.onSurfaceTertiary} value={subject} onChangeText={setSubject} style={styles.input} />
              <View style={{ flexDirection: "row", gap: 6, marginVertical: 8, flexWrap: "wrap" }}>
                {["General", "Payments", "Courses", "Certificates", "Bug"].map(c => (
                  <Pressable key={c} testID={`cat-${c}`} onPress={() => setCategory(c)} style={[styles.catChip, category === c && styles.catChipActive]}>
                    <Text style={[styles.catChipText, category === c && { color: theme.color.onBrandPrimary, fontWeight: "800" }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput testID="ticket-desc" placeholder="Describe your issue..." placeholderTextColor={theme.color.onSurfaceTertiary} value={desc} onChangeText={setDesc} multiline style={[styles.input, { height: 120, textAlignVertical: "top" }]} />
              {msg && <Text style={[styles.msg, msg.startsWith("✓") && { color: theme.color.success }]}>{msg}</Text>}
              <Pressable testID="submit-ticket" onPress={submitTicket} disabled={submitting} style={styles.submitBtn}>
                {submitting ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : <Text style={styles.submitText}>Submit Ticket</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function ContactRow({ icon, label, sub, color, onPress, testID }: any) {
  return (
    <Pressable onPress={onPress} testID={testID} style={styles.contact}>
      <View style={[styles.contactIcon, { backgroundColor: color }]}>
        <Feather name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Feather name="external-link" size={16} color={theme.color.onSurfaceTertiary} />
    </Pressable>
  );
}

function SocialBtn({ icon, url, testID }: any) {
  return (
    <Pressable testID={testID} onPress={() => Linking.openURL(url).catch(() => {})} style={styles.social}>
      <Feather name={icon} size={20} color={theme.color.brand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { color: theme.color.onSurface, fontSize: 22, fontWeight: "800" },
  sub: { color: theme.color.onSurfaceSecondary, fontSize: 12, marginTop: 2 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tab: { flex: 1, height: 38, borderRadius: 999, backgroundColor: theme.color.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.color.border },
  tabActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  tabText: { color: theme.color.onSurface, fontWeight: "600", fontSize: 12 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 46, borderRadius: 14, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border },
  searchInput: { flex: 1, color: theme.color.onSurface, fontSize: 14 },
  secHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  secIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.color.brandSecondary, alignItems: "center", justifyContent: "center" },
  secTitle: { color: theme.color.onSurface, fontSize: 15, fontWeight: "800" },
  faq: { padding: 14, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border },
  faqQ: { color: theme.color.onSurface, fontSize: 14, fontWeight: "600", flex: 1, paddingRight: 8 },
  faqA: { color: theme.color.onSurfaceSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  heroCard: { padding: 22, borderRadius: 20, alignItems: "center", borderWidth: 1, borderColor: theme.color.border, gap: 6 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: theme.color.brand, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroTitle: { color: theme.color.onSurface, fontSize: 20, fontWeight: "800", textAlign: "center" },
  heroSub: { color: theme.color.onSurfaceSecondary, fontSize: 13, textAlign: "center" },
  contact: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border },
  contactIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  contactLabel: { color: theme.color.onSurface, fontWeight: "700" },
  contactSub: { color: theme.color.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  section: { color: theme.color.onSurface, fontSize: 16, fontWeight: "700", marginTop: 22, marginBottom: 10 },
  socialRow: { flexDirection: "row", gap: 10 },
  social: { width: 50, height: 50, borderRadius: 14, backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.brand, alignItems: "center", justifyContent: "center" },
  ticketCta: { flexDirection: "row", gap: 8, height: 50, backgroundColor: theme.color.brand, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 22 },
  ticketCtaText: { color: theme.color.onBrandPrimary, fontWeight: "800" },
  empty: { alignItems: "center", padding: 32, backgroundColor: theme.color.surfaceSecondary, borderRadius: 20, borderWidth: 1, borderColor: theme.color.border, gap: 8 },
  emptyT: { color: theme.color.onSurface, fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptyS: { color: theme.color.onSurfaceSecondary, textAlign: "center" },
  ticket: { padding: 14, backgroundColor: theme.color.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.color.border, gap: 4 },
  ticketId: { color: theme.color.brand, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: theme.color.onBrandPrimary, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  ticketSubject: { color: theme.color.onSurface, fontSize: 15, fontWeight: "700", marginTop: 4 },
  ticketDesc: { color: theme.color.onSurfaceSecondary, fontSize: 13, marginTop: 2 },
  ticketDate: { color: theme.color.onSurfaceTertiary, fontSize: 10, marginTop: 6 },
  replies: { marginTop: 8, gap: 6 },
  reply: { padding: 10, backgroundColor: theme.color.surfaceTertiary, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: theme.color.brand },
  replyBy: { color: theme.color.brand, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  replyMsg: { color: theme.color.onSurface, fontSize: 13, marginTop: 4 },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modal: { backgroundColor: theme.color.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderTopWidth: 1, borderColor: theme.color.border, maxHeight: "80%" },
  input: { backgroundColor: theme.color.surfaceTertiary, borderRadius: 12, color: theme.color.onSurface, padding: 14, borderWidth: 1, borderColor: theme.color.border, fontSize: 14, marginTop: 4 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.color.surfaceTertiary, borderWidth: 1, borderColor: theme.color.border },
  catChipActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  catChipText: { color: theme.color.onSurface, fontSize: 12, fontWeight: "600" },
  msg: { color: theme.color.error, fontSize: 13, padding: 8, textAlign: "center" },
  submitBtn: { backgroundColor: theme.color.brand, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 14 },
  submitText: { color: theme.color.onBrandPrimary, fontWeight: "800", fontSize: 15 },
});
