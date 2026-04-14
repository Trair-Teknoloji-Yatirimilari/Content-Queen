import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Language = "tr" | "en";

const translations: Record<Language, Record<string, string>> = {
  tr: {
    // Splash & Onboarding
    "splash.welcome": "Content Queen'e Hoşgeldiniz",
    "splash.subtitle": "Profesyonel görseller oluşturun",
    "splash.selectLanguage": "Dil Seçin",
    "splash.next": "İleri",
    "splash.agree": "Kabul Et",
    "splash.disagree": "Reddet",
    "onboarding.slide1.title": "Fotoğraflarını Yükle",
    "onboarding.slide1.subtitle": "5-10 fotoğrafını yükle, yapay zeka seni tanısın.\nYüzün, vücut tipin, tarzın — hepsi öğrenilecek.",
    "onboarding.slide2.title": "Referans Seç",
    "onboarding.slide2.subtitle": "Pinterest'ten veya sosyal medyadan beğendiğin bir pozu seç.\nAI seni o fotoğrafın içine yerleştirecek.",
    "onboarding.slide3.title": "Kraliçe Gibi Parla",
    "onboarding.slide3.subtitle": "Sanki orada çekilmiş gibi profesyonel görseller oluştur.\nSosyal medyanda fark yarat.",
    "onboarding.skip": "Atla",
    "onboarding.next": "Devam",
    "onboarding.start": "Başlayalım",

    // Login
    "login.phone": "Telefon Numarası",
    "login.phonePlaceholder": "5XX XXX XX XX",
    "login.sendOtp": "Doğrulama Kodu Gönder",
    "login.otpTitle": "Doğrulama Kodu",
    "login.otpSent": "numarasına gönderildi",
    "login.verify": "Doğrula",
    "login.resend": "Kodu Tekrar Gönder",
    "login.resendIn": "Tekrar gönder",
    "login.changeNumber": "Numarayı Değiştir",
    "login.termsText": "'nı ve ",
    "login.termsAccept": "'nı okudum ve kabul ediyorum.",
    "login.invalidPhone": "Geçerli bir telefon numarası girin",
    "login.acceptTerms": "Devam etmek için sözleşmeleri kabul etmelisiniz",
    "login.smsFailed": "SMS gönderilemedi",
    "login.verifyFailed": "Doğrulama başarısız",
    "login.error": "Bir hata oluştu. Tekrar deneyin.",
    "login.tagline": "Kraliçe gibi parla ✨",

    // Home
    "home.title": "Content Queen",
    "home.tagline": "Kraliçe gibi parla ✨",
    "home.remainingCredits": "Kalan Kredi",
    "home.plan": "Plan",
    "home.created": "Oluşturulan",
    "home.aiModel": "AI Modelim",
    "home.references": "Referanslarım",
    "home.settings": "Ayarlar",
    "home.recentImages": "Son Görseller",
    "home.seeAll": "Tümünü Gör",
    "home.noImages": "Henüz Görsel Yok",
    "home.noImagesDesc": "İlk görselini oluştur ve\nkraliçe gibi parlamaya başla",
    "home.letsStart": "Hadi Başlayalım",
    "home.styleQuestion": "Hangi stilde parlamak istersin?",
    "home.showcase": "✨ Showcase",
    "home.showcaseSub": "Referans görselleri",
    "home.noShowcase": "Henüz paylaşım yok",
    "home.noShowcaseDesc": "Görsel oluştur ve showcase'e ekleyerek\nilk paylaşan sen ol!",
    "home.createNew": "Yeni Görsel Oluştur",
    "home.createModel": "AI Modelini Oluştur",
    "home.trainingInProgress": "Eğitim Devam Ediyor...",
    "home.processing": "İşleniyor",
    "home.failed": "Başarısız",

    // Training
    "training.title": "AI Modelini Oluştur",
    "training.subtitle": "Fotoğraflarını yükle, sana özel AI modeli eğitelim",
    "training.guide": "📸 Fotoğraf Rehberi",
    "training.tip1": "En az 5, ideal olarak 10-15 fotoğraf yükle",
    "training.tip2": "Yüz yakın çekim, yarım boy ve tam boy karışık olsun",
    "training.tip3": "Farklı açılardan fotoğraflar ekle (önden, yandan)",
    "training.tip4": "İyi aydınlatılmış, net fotoğraflar seç",
    "training.tip5": "Güneş gözlüğü veya maske olmadan",
    "training.photos": "Fotoğraflar",
    "training.enough": "✓ Yeterli fotoğraf",
    "training.needMore": "fotoğraf daha gerekli",
    "training.start": "AI Modelimi Eğit",
    "training.ready": "AI Modelin Hazır",
    "training.readyDesc": "Kişisel AI modelin başarıyla oluşturuldu.\nArtık profesyonel görseller üretebilirsin.",
    "training.createImage": "Görsel Oluştur",
    "training.updateModel": "Modeli Güncelle",
    "training.goHome": "Ana Sayfaya Dön",
    "training.inProgress": "AI Modelin Eğitiliyor",
    "training.inProgressDesc": "Yapay zeka seni tanımayı öğreniyor.\nBu işlem genellikle 5-10 dakika sürer.",
    "training.canClose": "💡 Uygulamayı kapatabilirsin.\nModelin hazır olduğunda bildirim göndereceğiz.",
    "training.cancel": "Eğitimi İptal Et",
    "training.minPhotos": "Yetersiz Fotoğraf",
    "training.deletePhoto": "Fotoğrafı Sil",
    "training.deletePhotoConfirm": "Bu fotoğrafı silmek istediğinize emin misiniz?",
    "training.reset": "Sıfırla",
    "training.resetConfirm": "Eğitimi sıfırlayıp tekrar denemek istiyor musunuz?",
    "training.back": "← Geri",
    "training.add": "Ekle",

    // Content Reference
    "contentRef.title": "Referans Seç",
    "contentRef.heading": "Referans Fotoğraf Seç",
    "contentRef.desc": "Pinterest veya sosyal medyadan beğendiğin\nbir pozu seç, AI seni o pozda oluştursun.",
    "contentRef.pickFromGallery": "Galeriden Seç",
    "contentRef.tip1": "Pozun net ve belirgin olduğu fotoğraflar seç",
    "contentRef.tip2": "İyi aydınlatılmış, yüksek kaliteli görseller tercih et",
    "contentRef.tip3": "Kıyafet ve aksesuar detayları görünmeli",
    "contentRef.change": "Değiştir",
    "contentRef.selectStyle": "Stil Seç",
    "contentRef.generate": "Görsel Oluştur",
    "contentRef.uploading": "Yükleniyor...",
    "contentRef.noCredits": "Krediniz Bitti",
    "contentRef.noCreditsDesc": "Görsel oluşturmak için kredi satın almanız gerekiyor.",
    "contentRef.buyCredits": "Kredi Satın Al",

    // Generate
    "generate.title": "Görsel Oluştur",
    "generate.generating": "Oluşturuluyor",
    "generate.waitMessage": "Bu işlem 30-60 saniye sürebilir.\nLütfen bekleyin...",
    "generate.success": "Başarılı! 🎉",
    "generate.successDesc": "Görselin hazırlandı",
    "generate.save": "💾 Kaydet",
    "generate.share": "📤 Paylaş",
    "generate.instagramShare": "Instagram'da Paylaş",
    "generate.goHome": "Ana Sayfaya Dön",
    "generate.createNew": "Yeni Görsel Oluştur",
    "generate.error": "Bir Sorun Oluştu",
    "generate.retry": "Tekrar Dene",
    "generate.goBack": "Geri Dön",
    "generate.saved": "Kaydedildi ✅",
    "generate.savedDesc": "Görsel galerine kaydedildi.",
    "generate.reference": "Referans Görsel",
    "generate.aiDesc": "AI, kişisel modelini kullanarak seni bu pozda\nprofesyonel bir fotoğraf olarak oluşturacak.",

    // Pricing
    "pricing.title": "Paketler",
    "pricing.currentCredits": "Mevcut Kredin",
    "pricing.creditPacks": "Kredi Paketleri",
    "pricing.subscription": "Abonelik",
    "pricing.credits": "kredi",
    "pricing.perCredit": "Kredi başına",
    "pricing.savings": "tasarruf",
    "pricing.mostPopular": "EN POPÜLER",
    "pricing.recommended": "ÖNERİLEN",
    "pricing.subscribe": "Abone Ol",
    "pricing.restore": "Satın Almaları Geri Yükle",
    "pricing.creditsInfo": "Krediler süresiz geçerlidir. Her görsel oluşturma 1 kredi harcar.\nÖdeme, satın alma onaylandığında Apple ID hesabınızdan tahsil edilir.",
    "pricing.subsInfo": "Abonelikler otomatik yenilenir. İstediğiniz zaman iptal edebilirsiniz.",
    "pricing.subsDetails": "Abonelik Bilgileri",

    // Settings
    "settings.title": "Ayarlar",
    "settings.language": "DİL",
    "settings.languageLabel": "Dil",
    "settings.notifications": "BİLDİRİMLER",
    "settings.pushNotif": "Push Bildirimleri",
    "settings.pushNotifDesc": "Görsel oluşturma tamamlandığında bildir",
    "settings.account": "HESAP",
    "settings.phone": "Telefon",
    "settings.about": "HAKKINDA",
    "settings.version": "Sürüm",
    "settings.privacy": "Gizlilik Politikası",
    "settings.terms": "Kullanım Şartları",
    "settings.logout": "Çıkış Yap",
    "settings.logoutConfirm": "Oturumunuzu kapatmak istediğinizden emin misiniz?",
    "settings.deleteAccount": "Hesabı Sil",
    "settings.deleteConfirm": "Bu işlem geri alınamaz. Tüm verileriniz, görselleriniz ve AI modeliniz silinecektir.",

    // Image Detail
    "imageDetail.title": "Görsel Detay",
    "imageDetail.date": "Tarih",
    "imageDetail.style": "Stil",
    "imageDetail.status": "Durum",
    "imageDetail.credit": "Kredi",
    "imageDetail.reference": "Referans Görsel",
    "imageDetail.delete": "Görseli Sil",
    "imageDetail.deleteConfirm": "Bu görseli silmek istediğinize emin misiniz?",
    "imageDetail.addShowcase": "✨ Showcase'e Ekle",
    "imageDetail.showcaseAdded": "Görselin showcase'e eklendi. Herkes görebilir!",
    "imageDetail.showcaseExists": "Bu görsel zaten showcase'de.",
    "imageDetail.completed": "Tamamlandı ✅",
    "imageDetail.failedStatus": "Başarısız ❌",
    "imageDetail.processingStatus": "İşleniyor ⏳",
    "imageDetail.notFound": "Görsel bulunamadı",

    // Common
    "common.skip": "Atla",
    "common.cancel": "İptal",
    "common.save": "Kaydet",
    "common.delete": "Sil",
    "common.loading": "Yükleniyor...",
    "common.error": "Hata",
    "common.success": "Başarılı",
    "common.info": "Bilgi",

    // KVKK
    "kvkk.title": "Gizlilik Politikası ve Kullanım Şartları",
    "kvkk.description": "Content Queen uygulamasını kullanmaya devam etmek için aşağıdaki şartları kabul etmelisiniz.",
    "kvkk.privacy": "Gizlilik Politikası",
    "kvkk.terms": "Kullanım Şartları",
    "kvkk.dataProcessing": "Veri İşleme Onayı",
    "kvkk.agree": "Tüm şartları kabul ediyorum",
    "kvkk.required": "Devam etmek için tüm şartları kabul etmelisiniz",
  },
  en: {
    // Splash & Onboarding
    "splash.welcome": "Welcome to Content Queen",
    "splash.subtitle": "Create professional visuals",
    "splash.selectLanguage": "Select Language",
    "splash.next": "Next",
    "splash.agree": "Agree",
    "splash.disagree": "Disagree",
    "onboarding.slide1.title": "Upload Your Photos",
    "onboarding.slide1.subtitle": "Upload 5-10 photos so AI can learn your look.\nYour face, body type, style — all will be learned.",
    "onboarding.slide2.title": "Pick a Reference",
    "onboarding.slide2.subtitle": "Choose a pose from Pinterest or social media.\nAI will place you right into that photo.",
    "onboarding.slide3.title": "Shine Like a Queen",
    "onboarding.slide3.subtitle": "Create professional images as if you were there.\nStand out on social media.",
    "onboarding.skip": "Skip",
    "onboarding.next": "Next",
    "onboarding.start": "Let's Go",

    // Login
    "login.phone": "Phone Number",
    "login.phonePlaceholder": "5XX XXX XX XX",
    "login.sendOtp": "Send Verification Code",
    "login.otpTitle": "Verification Code",
    "login.otpSent": "sent to",
    "login.verify": "Verify",
    "login.resend": "Resend Code",
    "login.resendIn": "Resend in",
    "login.changeNumber": "Change Number",
    "login.termsText": " and ",
    "login.termsAccept": " — I have read and agree.",
    "login.invalidPhone": "Enter a valid phone number",
    "login.acceptTerms": "You must accept the terms to continue",
    "login.smsFailed": "Failed to send SMS",
    "login.verifyFailed": "Verification failed",
    "login.error": "Something went wrong. Try again.",
    "login.tagline": "Shine like a queen ✨",

    // Home
    "home.title": "Content Queen",
    "home.tagline": "Shine like a queen ✨",
    "home.remainingCredits": "Credits Left",
    "home.plan": "Plan",
    "home.created": "Created",
    "home.aiModel": "My AI Model",
    "home.references": "My References",
    "home.settings": "Settings",
    "home.recentImages": "Recent Images",
    "home.seeAll": "See All",
    "home.noImages": "No Images Yet",
    "home.noImagesDesc": "Create your first image and\nstart shining like a queen",
    "home.letsStart": "Let's Start",
    "home.styleQuestion": "Which style do you want to shine in?",
    "home.showcase": "✨ Showcase",
    "home.showcaseSub": "Reference images",
    "home.noShowcase": "No shares yet",
    "home.noShowcaseDesc": "Create an image and share it to\nthe showcase — be the first!",
    "home.createNew": "Create New Image",
    "home.createModel": "Create AI Model",
    "home.trainingInProgress": "Training in Progress...",
    "home.processing": "Processing",
    "home.failed": "Failed",

    // Training
    "training.title": "Create Your AI Model",
    "training.subtitle": "Upload your photos, we'll train a custom AI model for you",
    "training.guide": "📸 Photo Guide",
    "training.tip1": "Upload at least 5, ideally 10-15 photos",
    "training.tip2": "Mix close-up, half-body and full-body shots",
    "training.tip3": "Add photos from different angles (front, side)",
    "training.tip4": "Choose well-lit, clear photos",
    "training.tip5": "No sunglasses or masks",
    "training.photos": "Photos",
    "training.enough": "✓ Enough photos",
    "training.needMore": "more photos needed",
    "training.start": "Train My AI Model",
    "training.ready": "Your AI Model is Ready",
    "training.readyDesc": "Your personal AI model was created successfully.\nYou can now generate professional images.",
    "training.createImage": "Create Image",
    "training.updateModel": "Update Model",
    "training.goHome": "Go to Home",
    "training.inProgress": "Training Your AI Model",
    "training.inProgressDesc": "AI is learning to recognize you.\nThis usually takes 5-10 minutes.",
    "training.canClose": "💡 You can close the app.\nWe'll notify you when your model is ready.",
    "training.cancel": "Cancel Training",
    "training.minPhotos": "Not Enough Photos",
    "training.deletePhoto": "Delete Photo",
    "training.deletePhotoConfirm": "Are you sure you want to delete this photo?",
    "training.reset": "Reset",
    "training.resetConfirm": "Do you want to reset and try again?",
    "training.back": "← Back",
    "training.add": "Add",

    // Content Reference
    "contentRef.title": "Pick a Reference",
    "contentRef.heading": "Choose a Reference Photo",
    "contentRef.desc": "Pick a pose from Pinterest or social media,\nAI will create you in that pose.",
    "contentRef.pickFromGallery": "Pick from Gallery",
    "contentRef.tip1": "Choose photos with clear, visible poses",
    "contentRef.tip2": "Prefer well-lit, high-quality images",
    "contentRef.tip3": "Clothing and accessory details should be visible",
    "contentRef.change": "Change",
    "contentRef.selectStyle": "Select Style",
    "contentRef.generate": "Generate Image",
    "contentRef.uploading": "Uploading...",
    "contentRef.noCredits": "Out of Credits",
    "contentRef.noCreditsDesc": "You need credits to generate images.",
    "contentRef.buyCredits": "Buy Credits",

    // Generate
    "generate.title": "Generate Image",
    "generate.generating": "Generating",
    "generate.waitMessage": "This may take 30-60 seconds.\nPlease wait...",
    "generate.success": "Success! 🎉",
    "generate.successDesc": "Your image is ready",
    "generate.save": "💾 Save",
    "generate.share": "📤 Share",
    "generate.instagramShare": "Share on Instagram",
    "generate.goHome": "Go to Home",
    "generate.createNew": "Create New Image",
    "generate.error": "Something Went Wrong",
    "generate.retry": "Try Again",
    "generate.goBack": "Go Back",
    "generate.saved": "Saved ✅",
    "generate.savedDesc": "Image saved to your gallery.",
    "generate.reference": "Reference Image",
    "generate.aiDesc": "AI will create a professional photo of you\nin this pose using your personal model.",

    // Pricing
    "pricing.title": "Plans",
    "pricing.currentCredits": "Your Credits",
    "pricing.creditPacks": "Credit Packs",
    "pricing.subscription": "Subscription",
    "pricing.credits": "credits",
    "pricing.perCredit": "Per credit",
    "pricing.savings": "savings",
    "pricing.mostPopular": "MOST POPULAR",
    "pricing.recommended": "RECOMMENDED",
    "pricing.subscribe": "Subscribe",
    "pricing.restore": "Restore Purchases",
    "pricing.creditsInfo": "Credits never expire. Each image generation costs 1 credit.\nPayment is charged to your Apple ID at confirmation.",
    "pricing.subsInfo": "Subscriptions auto-renew. Cancel anytime.",
    "pricing.subsDetails": "Subscription Details",

    // Settings
    "settings.title": "Settings",
    "settings.language": "LANGUAGE",
    "settings.languageLabel": "Language",
    "settings.notifications": "NOTIFICATIONS",
    "settings.pushNotif": "Push Notifications",
    "settings.pushNotifDesc": "Notify when image generation is complete",
    "settings.account": "ACCOUNT",
    "settings.phone": "Phone",
    "settings.about": "ABOUT",
    "settings.version": "Version",
    "settings.privacy": "Privacy Policy",
    "settings.terms": "Terms of Service",
    "settings.logout": "Sign Out",
    "settings.logoutConfirm": "Are you sure you want to sign out?",
    "settings.deleteAccount": "Delete Account",
    "settings.deleteConfirm": "This cannot be undone. All your data, images and AI model will be deleted.",

    // Image Detail
    "imageDetail.title": "Image Detail",
    "imageDetail.date": "Date",
    "imageDetail.style": "Style",
    "imageDetail.status": "Status",
    "imageDetail.credit": "Credit",
    "imageDetail.reference": "Reference Image",
    "imageDetail.delete": "Delete Image",
    "imageDetail.deleteConfirm": "Are you sure you want to delete this image?",
    "imageDetail.addShowcase": "✨ Add to Showcase",
    "imageDetail.showcaseAdded": "Your image was added to the showcase. Everyone can see it!",
    "imageDetail.showcaseExists": "This image is already in the showcase.",
    "imageDetail.completed": "Completed ✅",
    "imageDetail.failedStatus": "Failed ❌",
    "imageDetail.processingStatus": "Processing ⏳",
    "imageDetail.notFound": "Image not found",

    // Common
    "common.skip": "Skip",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.info": "Info",

    // KVKK
    "kvkk.title": "Privacy Policy & Terms of Service",
    "kvkk.description": "You must accept the following terms to continue using Content Queen.",
    "kvkk.privacy": "Privacy Policy",
    "kvkk.terms": "Terms of Service",
    "kvkk.dataProcessing": "Data Processing Consent",
    "kvkk.agree": "I agree to all terms",
    "kvkk.required": "You must accept all terms to continue",
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
      console.error("Language load error:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem("content_queen_language", lang);
    } catch (error) {
      console.error("Language save error:", error);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations["en"]?.[key] || key;
  };

  if (!isLoaded) return null;

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
