import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";

export type Lang = "en" | "hi" | "ml" | "ta";

export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
];

type Dict = Record<string, Record<Lang, string>>;

export const dict: Dict = {
  "tab.home": { en: "Home", hi: "होम", ml: "ഹോം", ta: "முகப்பு" },
  "tab.learning": { en: "Learn", hi: "सीखें", ml: "പഠിക്കുക", ta: "கற்க" },
  "tab.quiz": { en: "Quiz", hi: "क्विज़", ml: "ക്വിസ്", ta: "வினா" },
  "tab.notes": { en: "Notes", hi: "नोट्स", ml: "കുറിപ്പുകൾ", ta: "குறிப்புகள்" },
  "tab.profile": { en: "Profile", hi: "प्रोफ़ाइल", ml: "പ്രൊഫൈൽ", ta: "சுயவிவரம்" },

  "home.namaste": { en: "Namaste,", hi: "नमस्ते,", ml: "നമസ്തേ,", ta: "வணக்கம்," },
  "home.search_placeholder": { en: "Search courses, herbs, topics...", hi: "कोर्स, जड़ी-बूटी खोजें...", ml: "കോഴ്സുകൾ തിരയുക...", ta: "பாடங்கள் தேடுங்கள்..." },
  "home.featured": { en: "Featured Courses", hi: "विशेष कोर्स", ml: "പ്രധാന കോഴ്സുകൾ", ta: "சிறப்பு பாடங்கள்" },
  "home.all_courses": { en: "All Courses", hi: "सभी कोर्स", ml: "എല്ലാ കോഴ്സുകളും", ta: "அனைத்து பாடங்கள்" },
  "home.no_results": { en: "No courses match your search", hi: "कोई कोर्स नहीं मिला", ml: "കോഴ്സുകൾ കണ്ടെത്തിയില്ല", ta: "பாடங்கள் இல்லை" },

  "course.about": { en: "About this course", hi: "इस कोर्स के बारे में", ml: "ഈ കോഴ്സിനെക്കുറിച്ച്", ta: "இந்தப் பாடம் பற்றி" },
  "course.curriculum": { en: "Curriculum", hi: "पाठ्यक्रम", ml: "പാഠ്യപദ്ധതി", ta: "பாடத்திட்டம்" },
  "course.enroll": { en: "Enroll Now", hi: "अभी नामांकन करें", ml: "ഇപ്പോൾ ചേരുക", ta: "சேருங்கள்" },
  "course.start": { en: "Start Learning", hi: "सीखना शुरू करें", ml: "പഠനം ആരംഭിക്കുക", ta: "கற்கத் தொடங்குங்கள்" },
  "course.preview": { en: "PREVIEW", hi: "मुफ़्त", ml: "സൗജന്യം", ta: "இலவசம்" },
  "course.preview_free": { en: "Watch this lesson free", hi: "यह पाठ मुफ़्त देखें", ml: "ഈ പാഠം സൗജന്യമായി കാണുക", ta: "இந்த பாடம் இலவசம்" },

  "checkout.title": { en: "Checkout", hi: "चेकआउट", ml: "ചെക്കൗട്ട്", ta: "வாங்குதல்" },
  "checkout.method": { en: "Payment method", hi: "भुगतान विधि", ml: "പേയ്മെന്റ് രീതി", ta: "பணம் செலுத்தும் முறை" },
  "checkout.total": { en: "Total", hi: "कुल", ml: "ആകെ", ta: "மொத்தம்" },

  "profile.language": { en: "Language", hi: "भाषा", ml: "ഭാഷ", ta: "மொழி" },
  "profile.admin": { en: "Admin Dashboard", hi: "एडमिन डैशबोर्ड", ml: "അഡ്മിൻ ഡാഷ്ബോർഡ്", ta: "நிர்வாக டாஷ்போர்டு" },
  "profile.certificates": { en: "Certificates", hi: "प्रमाणपत्र", ml: "സർട്ടിഫിക്കറ്റുകൾ", ta: "சான்றிதழ்கள்" },
  "profile.signout": { en: "Sign out", hi: "साइन आउट", ml: "സൈൻ ഔട്ട്", ta: "வெளியேறு" },

  "learning.title": { en: "My Learning", hi: "मेरी पढ़ाई", ml: "എന്റെ പഠനം", ta: "என் கற்றல்" },
  "learning.view_cert": { en: "View Certificate", hi: "प्रमाणपत्र देखें", ml: "സർട്ടിഫിക്കറ്റ് കാണുക", ta: "சான்றிதழ் காண்க" },
  "learning.upcoming_live": { en: "Upcoming Live Classes", hi: "आगामी लाइव कक्षाएं", ml: "വരാനിരിക്കുന്ന ലൈവ് ക്ലാസുകൾ", ta: "வரவிருக்கும் நேரடி வகுப்புகள்" },

  "common.cancel": { en: "Cancel", hi: "रद्द करें", ml: "റദ്ദാക്കുക", ta: "ரத்து" },
  "common.save": { en: "Save", hi: "सहेजें", ml: "സംരക്ഷിക്കുക", ta: "சேமி" },
  "common.delete": { en: "Delete", hi: "हटाएं", ml: "ഇല്ലാതാക്കുക", ta: "நீக்கு" },
};

type I18n = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const Ctx = createContext<I18n | null>(null);
const KEY = "ayur_lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    (async () => {
      const v = await storage.getItem<string>(KEY, "");
      if (v && ["en", "hi", "ml", "ta"].includes(v)) setLangState(v as Lang);
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    storage.setItem(KEY, l);
  }, []);

  const t = useCallback(
    (k: string) => dict[k]?.[lang] ?? dict[k]?.en ?? k,
    [lang]
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be inside I18nProvider");
  return v;
}
