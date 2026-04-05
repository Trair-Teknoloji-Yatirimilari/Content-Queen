# Content Queen - Proje Görev Planı

## Fase 1: Temel Kurulum ve Kullanıcı Yönetimi

- [x] Proje yapısını ve klasör düzenini hazırla
- [x] Tema ve renk paletini yapılandır (design.md'ye uygun)
- [x] Apple ID ve Gmail giriş entegrasyonunu kur
- [x] Kullanıcı oturumu yönetimi (AsyncStorage/SecureStore)
- [x] Temel navigasyon yapısını kur (Tab Bar)
- [ ] Splash ekranı ve onboarding tasarla
- [ ] KVKK/Gizlilik metinleri ve onay ekranını ekle

## Fase 2: Referans Fotoğraf Yönetimi

- [x] Referans fotoğraf yönetimi ekranını tasarla
- [x] Fotoğraf yükleme (kamera/galeri) işlevselliğini ekle
- [x] Fotoğraf silme ve düzenleme işlevselliğini ekle
- [x] Fotoğraf önizleme ve grid görünümünü uygula
- [x] Talimatlar ve rehberlik mesajlarını ekle (çözünürlük, yüz hatları vb.)
- [ ] Yüklenen fotoğrafları yerel depolama alanında sakla (AsyncStorage)

## Fase 3: İçerik Referansı ve Görsel Oluşturma Akışı

- [x] İçerik referansı yükleme ekranını tasarla
- [x] Fotoğraf yükleme ve önizleme işlevselliğini ekle
- [x] Referans fotoğraf seçim ekranını tasarla
- [x] Görsel oluşturma ekranını tasarla (Generate butonu)
- [x] Generate butonunun durumunu yönet (gri/aktif)
- [x] Sonuç ekranını tasarla (görsel görüntüleme, indirme, paylaşma)

## Fase 4: Gemini API Entegrasyonu

- [ ] Gemini API anahtarını yapılandır (webdev_request_secrets)
- [ ] Görsel analiz ve JSON komut oluşturma mantığını uygula
- [ ] Nano Banana altyapısı entegrasyonunu kur
- [ ] Fotoğraf işleme ve dönüştürme mantığını uygula
- [ ] Hata yönetimi ve uygunsuz içerik filtrelemesi ekle
- [ ] Yükleme göstergesi ve ilerleme takibi uygula (30-40 saniye)

## Fase 5: Abonelik ve Kredi Yönetimi

- [ ] Abonelik modeli ve paket yapısını tasarla
- [ ] Ödeme entegrasyonunu kur (App Store In-App Purchases)
- [ ] Kredi sistemi ve kredi düşme mantığını uygula
- [ ] Abonelik durumunu izle ve yenileme işlevselliğini ekle
- [ ] Ücretsiz deneme hakkı yönetimi (1 fotoğraf)
- [ ] Ödeme başarısız durumlarını yönet

## Fase 6: Profil ve Ayarlar

- [x] Profil ekranını tasarla (kullanıcı bilgileri, istatistikler)
- [x] Çıkış (logout) işlevselliğini ekle
- [ ] Ayarlar ekranını tasarla (dil, bildirimler, gizlilik)
- [ ] Dil seçimi ve i18n entegrasyonunu kur
- [ ] Bildirim ayarlarını yönet
- [ ] Hesap silme seçeneğini ekle

## Fase 7: Push Bildirimleri ve Analitikler

- [ ] Push bildirim sistemini kur (expo-notifications)
- [ ] Teşvik edici mesajlar ve kampanya bildirimleri ekle
- [ ] Bildirim zamanlaması mantığını uygula (7 gün sonra haftada 2x)
- [ ] Analitik takibi kur (kullanıcı davranışı, yaş aralığı, satın alma)
- [ ] Raporlama ve istatistik paneli tasarla

## Fase 8: Uygulama Branding ve Logo

- [x] Uygulama logosu oluştur (AI ile generate)
- [x] Splash screen ikonu hazırla
- [x] Android adaptive icon hazırla
- [x] app.config.ts'de branding bilgilerini güncelle
- [ ] App Store ve Play Store için meta veriler hazırla

## Fase 9: Testler ve Optimizasyon

- [ ] Tüm kullanıcı akışlarını end-to-end test et
- [ ] iOS cihazlarda performans testi yap
- [ ] Hata yönetimi ve edge case'leri test et
- [ ] Görsel kalitesi ve işleme hızını optimize et
- [ ] Bellek kullanımını optimize et
- [ ] Ağ bağlantısı sorunlarını yönet

## Fase 10: Deployment ve İlk Checkpoint

- [ ] Tüm testleri tamamla
- [ ] App Store için hazırlıkları yap
- [ ] Privacy Policy ve Terms of Service hazırla
- [ ] İlk checkpoint oluştur
- [ ] Publish butonuyla APK/IPA oluştur
