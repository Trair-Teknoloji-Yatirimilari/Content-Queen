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
- [x] Yüklenen fotoğrafları yerel depolama alanında sakla (AsyncStorage)

## Fase 3: İçerik Referansı ve Görsel Oluşturma Akışı

- [x] İçerik referansı yükleme ekranını tasarla
- [x] Fotoğraf yükleme ve önizleme işlevselliğini ekle
- [x] Referans fotoğraf seçim ekranını tasarla
- [x] Görsel oluşturma ekranını tasarla (Generate butonu)
- [x] Generate butonunun durumunu yönet (gri/aktif)
- [x] Sonuç ekranını tasarla (görsel görüntüleme, indirme, paylaşma)

## Fase 4: Replicate API Entegrasyonu

- [x] Replicate API anahtarını yapılandır (webdev_request_secrets)
- [x] Görsel oluşturma servisi oluştur (Flux Pro modeli)
- [x] Backend tRPC router'ına generatedImages endpoint'leri ekle
- [x] Görsel oluşturma ekranını backend API'ye bağla
- [x] Job status polling mekanizması uygula
- [ ] Hata yönetimi ve retry mantığını geliştir

## Fase 5: Abonelik ve Kredi Yönetimi

- [x] Kredi sistemi veritabanı şeması oluştur (userCredits tablosu)
- [x] Kredi kontrolü ve düşme mantığını uygula (deductCredits fonksiyonu)
- [x] Abonelik paketleri tanımla (free, pro, premium)
- [x] Backend tRPC router'ına credits endpoint'leri ekle
- [ ] Ödeme entegrasyonunu kur (App Store In-App Purchases)
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

- [x] Push bildirim sistemini kur (expo-notifications)
- [x] Görsel oluşturma tamamlandığında bildirim gönder
- [x] Bildirim tıklandığında ekrana yönlendir
- [x] Firebase Admin SDK entegrasyonu
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
