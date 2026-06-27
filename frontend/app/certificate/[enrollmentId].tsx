import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { useScreenshotProtection } from "@/src/hooks/useScreenshotProtection";
import { ScreenshotToast } from "@/src/components/ScreenshotToast";

type Cert = {
  enrollment_id: string;
  student_name: string;
  course_title: string;
  instructor: string;
  issued_at: string;
  certificate_id: string;
};

function buildHtml(c: Cert) {
  const date = new Date(c.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4 landscape; margin: 0; }
    body { margin: 0; font-family: 'Georgia', serif; background: #0A0D0B; color: #E8E5DF; }
    .cert { width: 100vw; height: 100vh; padding: 60px; box-sizing: border-box; background: linear-gradient(135deg, #0A0D0B 0%, #141A16 100%); border: 10px double #C5A059; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .crest { width: 90px; height: 90px; border: 3px solid #C5A059; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; color: #C5A059; margin-bottom: 16px; }
    .academy { font-size: 14px; letter-spacing: 6px; color: #C5A059; font-weight: 800; }
    .academy-sub { font-size: 11px; letter-spacing: 4px; color: #C2C0BA; margin-top: 4px; }
    .title { font-size: 44px; color: #C5A059; margin: 30px 0 4px; font-style: italic; }
    .sub { font-size: 13px; letter-spacing: 5px; color: #C2C0BA; }
    .name { font-size: 48px; color: #E8E5DF; margin: 24px 0 6px; border-bottom: 1px solid #C5A059; padding-bottom: 8px; }
    .desc { font-size: 14px; color: #C2C0BA; line-height: 1.6; max-width: 700px; margin-top: 16px; }
    .course { font-size: 22px; color: #C5A059; font-weight: 700; margin-top: 6px; }
    .footer { display: flex; justify-content: space-between; width: 100%; margin-top: 50px; font-size: 11px; color: #A3A09A; }
    .sigCol { text-align: center; }
    .sigLine { width: 180px; border-top: 1px solid #C5A059; margin-bottom: 4px; }
    .id { font-size: 10px; color: #A3A09A; margin-top: 30px; letter-spacing: 2px; }
  </style></head><body>
    <div class="cert">
      <div class="crest">🪔</div>
      <div class="academy">AYURVEDA NURSING ACADEMY</div>
      <div class="academy-sub">TRADITION · CARE · KNOWLEDGE</div>
      <div class="title">Certificate of Completion</div>
      <div class="sub">THIS IS TO CERTIFY THAT</div>
      <div class="name">${c.student_name}</div>
      <div class="desc">has successfully completed all modules, lessons and assessments of the course</div>
      <div class="course">${c.course_title}</div>
      <div class="footer">
        <div class="sigCol"><div class="sigLine"></div>${c.instructor}<br/><span style="font-size:10px">Course Instructor</span></div>
        <div class="sigCol"><div class="sigLine"></div>Academy Director<br/><span style="font-size:10px">Ayurveda Nursing Academy</span></div>
      </div>
      <div class="id">CERTIFICATE ID: ${c.certificate_id} · ISSUED ${date}</div>
    </div>
  </body></html>`;
}

export default function CertificateScreen() {
  const router = useRouter();
  const { enrollmentId } = useLocalSearchParams<{ enrollmentId: string }>();
  const [cert, setCert] = useState<Cert | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [shotVisible, setShotVisible] = useState(false);
  const printedRef = useRef(false);
  useScreenshotProtection(() => setShotVisible(true));

  useEffect(() => {
    api<Cert>(`/certificates/${enrollmentId}`)
      .then(setCert)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [enrollmentId]);

  const download = async () => {
    if (!cert || busy) return;
    setBusy(true);
    try {
      const html = buildHtml(cert);
      if (Platform.OS === "web") {
        const w = window.open("", "_blank", "width=900,height=700");
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Save your certificate" });
        }
      }
    } catch (e) {
      console.log("cert err", e);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <View style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={theme.color.brand} /></View>;
  if (!cert) return (
    <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
      <Feather name="x-circle" size={42} color={theme.color.error} />
      <Text style={styles.errTitle}>Certificate not yet earned</Text>
      <Text style={styles.errSub}>Complete all lessons in the course to earn your certificate.</Text>
      <Pressable onPress={() => router.back()} testID="cert-back" style={styles.cta}><Text style={styles.ctaText}>Back</Text></Pressable>
    </SafeAreaView>
  );

  const date = new Date(cert.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  // Auto-trigger download once for instant gratification (web only)
  if (Platform.OS === "web" && !printedRef.current && cert) {
    printedRef.current = true;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="cert-back"><Feather name="chevron-left" size={22} color={theme.color.onSurface} /></Pressable>
        <Text style={{ color: theme.color.onSurface, fontSize: 18, fontWeight: "800", flex: 1 }}>Certificate</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <LinearGradient colors={["#0A0D0B", "#141A16"]} style={styles.cert}>
          <View style={styles.border}>
            <View style={styles.crest}><Text style={styles.crestText}>🪔</Text></View>
            <Text style={styles.academy}>AYURVEDA NURSING ACADEMY</Text>
            <Text style={styles.academySub}>TRADITION · CARE · KNOWLEDGE</Text>

            <Text style={styles.certTitle}>Certificate of Completion</Text>
            <Text style={styles.certSub}>THIS IS TO CERTIFY THAT</Text>

            <Text style={styles.name}>{cert.student_name}</Text>
            <View style={styles.divider} />

            <Text style={styles.desc}>has successfully completed all lessons & assessments of the course</Text>
            <Text style={styles.courseName}>{cert.course_title}</Text>

            <View style={styles.sigRow}>
              <View style={styles.sigCol}>
                <View style={styles.sigLine} />
                <Text style={styles.sigName}>{cert.instructor}</Text>
                <Text style={styles.sigRole}>Course Instructor</Text>
              </View>
              <View style={styles.sigCol}>
                <View style={styles.sigLine} />
                <Text style={styles.sigName}>Academy Director</Text>
                <Text style={styles.sigRole}>Ayurveda Nursing Academy</Text>
              </View>
            </View>

            <Text style={styles.idText}>ID · {cert.certificate_id} · ISSUED {date}</Text>
          </View>
        </LinearGradient>

        <Pressable testID="download-cert" onPress={download} disabled={busy} style={[styles.downloadBtn, busy && { opacity: 0.7 }]}>
          {busy ? <ActivityIndicator color={theme.color.onBrandPrimary} /> : (
            <>
              <Feather name="download" size={18} color={theme.color.onBrandPrimary} />
              <Text style={styles.downloadText}>{Platform.OS === "web" ? "Print / Save as PDF" : "Download / Share PDF"}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
      <ScreenshotToast visible={shotVisible} onHide={() => setShotVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cert: { padding: 14, borderRadius: 16 },
  border: { borderWidth: 4, borderColor: theme.color.brand, borderRadius: 10, padding: 24, alignItems: "center", borderStyle: "double" as any },
  crest: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: theme.color.brand, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  crestText: { fontSize: 28 },
  academy: { color: theme.color.brand, fontSize: 11, letterSpacing: 4, fontWeight: "800" },
  academySub: { color: theme.color.onSurfaceSecondary, fontSize: 9, letterSpacing: 3, marginTop: 4 },
  certTitle: { color: theme.color.brand, fontSize: 26, marginTop: 24, fontStyle: "italic", fontWeight: "700" },
  certSub: { color: theme.color.onSurfaceSecondary, fontSize: 10, letterSpacing: 3, marginTop: 6 },
  name: { color: theme.color.onSurface, fontSize: 26, marginTop: 18, fontWeight: "800", textAlign: "center" },
  divider: { height: 1, backgroundColor: theme.color.brand, width: "60%", marginTop: 8 },
  desc: { color: theme.color.onSurfaceSecondary, fontSize: 12, textAlign: "center", marginTop: 14, lineHeight: 18 },
  courseName: { color: theme.color.brand, fontSize: 16, fontWeight: "700", marginTop: 6, textAlign: "center" },
  sigRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 40, gap: 16 },
  sigCol: { flex: 1, alignItems: "center" },
  sigLine: { height: 1, backgroundColor: theme.color.brand, width: "80%", marginBottom: 6 },
  sigName: { color: theme.color.onSurface, fontSize: 11, fontWeight: "700" },
  sigRole: { color: theme.color.onSurfaceTertiary, fontSize: 9, marginTop: 2 },
  idText: { color: theme.color.onSurfaceTertiary, fontSize: 9, letterSpacing: 1.5, marginTop: 30 },
  downloadBtn: { flexDirection: "row", gap: 8, height: 54, backgroundColor: theme.color.brand, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 20 },
  downloadText: { color: theme.color.onBrandPrimary, fontWeight: "800", fontSize: 15 },
  errTitle: { color: theme.color.onSurface, fontSize: 18, fontWeight: "700", marginTop: 16 },
  errSub: { color: theme.color.onSurfaceSecondary, marginTop: 6, textAlign: "center" },
  cta: { marginTop: 20, backgroundColor: theme.color.brand, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  ctaText: { color: theme.color.onBrandPrimary, fontWeight: "800" },
});
