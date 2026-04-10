import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Language = "tr" | "en";

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  tr: {
    // Splash & Onboarding
    "splash.welcome": "Content Queen'e Hoşgeldiniz",
    "splash.subtitle": "Profesyonel görseller oluşturun",
    "splash.selectLanguage": "Dil Seçin",
    "splash.turkish": "Türkçe",
    "splash.english": "English",
    "splash.next": "İleri",
    "splash.agree": "Kabul Et",
    "splash.disagree": "Reddet",

    // KVKK
    "kvkk.title": "Gizlilik Politikası ve Kullanım Şartları",
    "kvkk.description":
      "Content Queen uygulamasını kullanmaya devam etmek için aşağıdaki şartları kabul etmelisiniz.",
    "kvkk.privacy": "Gizlilik Politikası",
    "kvkk.terms": "Kullanım Şartları",
    "kvkk.dataProcessing": "Veri İşleme Onayı",
    "kvkk.agree": "Tüm şartları kabul ediyorum",
    "kvkk.required": "Devam etmek için tüm şartları kabul etmelisiniz",

    // Onboarding
    "onboarding.step1.title": "Referans Fotoğrafları",
    "onboarding.step1.description": "Yüksek kaliteli referans fotoğrafları yükleyin",
    "onboarding.step2.title": "İçerik Seçin",
    "onboarding.step2.description": "Dönüştürmek istediğiniz içeriği seçin",
    "onboarding.step3.title": "Görsel Oluşturun",
    "onboarding.step3.description": "AI ile profesyonel görseller oluşturun",

    // Common
    "common.skip": "Atla",
    "common.next": "İleri",
    "common.back": "Geri",
    "common.done": "Bitti",
    "common.cancel": "İptal",
    "common.save": "Kaydet",
    "common.delete": "Sil",
    "common.loading": "Yükleniyor...",
    "common.error": "Hata",
    "common.success": "Başarılı",
  },
  en: {
    // Splash & Onboarding
    "splash.welcome": "Welcome to Content Queen",
    "splash.subtitle": "Create professional visuals",
    "splash.selectLanguage": "Select Language",
    "splash.turkish": "Türkçe",
    "splash.english": "English",
    "splash.next": "Next",
    "splash.agree": "Agree",
    "splash.disagree": "Disagree",

    // KVKK
    "kvkk.title": "Privacy Policy & Terms of Service",
    "kvkk.description":
      "You must accept the following terms to continue using Content Queen.",
    "kvkk.privacy": "Privacy Policy",
    "kvkk.terms": "Terms of Service",
    "kvkk.dataProcessing": "Data Processing Consent",
    "kvkk.agree": "I agree to all terms",
    "kvkk.required": "You must accept all terms to continue",

    // Onboarding
    "onboarding.step1.title": "Reference Photos",
    "onboarding.step1.description": "Upload high-quality reference photos",
    "onboarding.step2.title": "Select Content",
    "onboarding.step2.description": "Choose content to transform",
    "onboarding.step3.title": "Create Visuals",
    "onboarding.step3.description": "Generate professional visuals with AI",

    // Common
    "common.skip": "Skip",
    "common.next": "Next",
    "common.back": "Back",
    "common.done": "Done",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("tr");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem("content_queen_language");
      if (saved && (saved === "tr" || saved === "en")) {
        setLanguageState(saved);
      }
    } catch (error) {
      console.error("Dil yükleme hatası:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem("content_queen_language", lang);
    } catch (error) {
      console.error("Dil kaydetme hatası:", error);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || key;
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
