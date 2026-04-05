# Content Queen - Mobil Uygulama Tasarımı

## Tasarım Felsefesi

Content Queen, iOS'ta birinci taraf bir uygulama gibi hissettirmek için Apple Human Interface Guidelines'ı takip eder. Tasarım, **mobil portre yönelimi (9:16)** ve **tek elle kullanım** için optimize edilmiştir. Arayüz, minimalist, temiz ve hızlı bir şekilde görseller oluşturmaya odaklanmıştır.

## Ekran Listesi

1. **Splash / Onboarding Ekranı** - Uygulamaya giriş ve hızlı tanıtım
2. **Login Ekranı** - Apple ID veya Gmail ile hızlı giriş
3. **Home Ekranı** - Ana sayfa, son oluşturulan görseller ve hızlı erişim
4. **Referans Fotoğraf Yönetimi** - Referans fotoğrafları yükleme, görüntüleme ve silme
5. **İçerik Referansı Yükleme** - Pinterest vb. kaynaklardan indirilen fotoğrafı yükleme
6. **Referans Seçimi** - Kullanıcının kendi referans fotoğraflarından birini seçme
7. **Görsel Oluşturma Ekranı** - Generate butonu ve oluşturma süreci
8. **Sonuç Ekranı** - Oluşturulan görseli görüntüleme ve indirme
9. **Profil Ekranı** - Kullanıcı bilgileri ve ayarlar
10. **Abonelik Ekranı** - Paket seçimi ve ödeme
11. **Ayarlar Ekranı** - Dil, bildirim ayarları, KVKK metinleri

## Birincil İçerik ve İşlevsellik

### Home Ekranı
- **Başlık:** "Content Queen" logosu ve kullanıcı adı
- **Hızlı Erişim Butonları:** "Yeni Görsel Oluştur" (ana CTA), "Referans Fotoğraflarım"
- **Son Oluşturulan Görseller:** Grid görünümünde son 6-8 görsel
- **Kredi Bilgisi:** Kalan kredi miktarı ve abonelik durumu
- **Bildirim Alanı:** Teşvik edici mesajlar ve promosyonlar

### Referans Fotoğraf Yönetimi
- **Yükleme Alanı:** "+ Fotoğraf Ekle" butonu, kamera veya galeri seçeneği
- **Fotoğraf Listesi:** Yüklenen referans fotoğrafların grid görünümü
- **Düzenleme Seçenekleri:** Silme ve ayarlama (birincil, ikincil vb.)
- **Talimatlar:** Yüksek çözünürlük, ten rengi ve yüz hatlarının belirgin olması gerektiğine dair açık talimatlar

### İçerik Referansı Yükleme
- **Yükleme Alanı:** Sürükle-bırak veya galeriden seç
- **Önizleme:** Yüklenen görselin küçük önizlemesi
- **Devam Butonu:** Referans seçim ekranına geçiş

### Referans Seçimi
- **Mevcut Referanslar:** Daha önce yüklenen referans fotoğrafların grid görünümü
- **Seçim Göstergesi:** Seçilen fotoğraf vurgulanır
- **Devam Butonu:** Görsel oluşturma ekranına geçiş

### Görsel Oluşturma Ekranı
- **Seçilen Görseller:** İçerik referansı ve yüz referansı küçük önizlemesi
- **Generate Butonu:** Başlangıçta gri/pasif, seçimler yapıldıktan sonra renkli ve aktif
- **Yükleme Göstergesi:** Görsel oluşturulurken ilerleme göstergesi (30-40 saniye)
- **Hata Mesajları:** Uygunsuz içerik durumunda kullanıcı dostu hata mesajları

### Sonuç Ekranı
- **Oluşturulan Görsel:** Tam ekran görünüm
- **İndirme Butonu:** "Telefonuma Kaydet" CTA
- **Paylaş Butonu:** Sosyal medyada paylaşma seçeneği
- **Yeni Görsel Oluştur:** Başa dön seçeneği

### Profil Ekranı
- **Kullanıcı Bilgileri:** Ad, email, profil resmi
- **Abonelik Durumu:** Mevcut paket, son ödeme tarihi, yenileme tarihi
- **İstatistikler:** Oluşturulan görsel sayısı, kalan kredi
- **Ayarlar Linki:** Dil, bildirim ayarları, gizlilik

## Anahtar Kullanıcı Akışları

### Akış 1: İlk Kez Kullanıcı
1. Uygulamayı indir → Splash ekranı
2. Apple ID veya Gmail ile giriş
3. KVKK metinlerini kabul et
4. Referans fotoğrafını yükle (talimatlar göster)
5. Ücretsiz deneme hakkı sunulur
6. Yeni görsel oluştur akışına yönlendir
7. Oluşturma başarılı → Ücretli paket sunumu

### Akış 2: Görsel Oluşturma (Ödeme Sonrası)
1. Home ekranından "Yeni Görsel Oluştur" seç
2. İçerik referansı yükle (Pinterest fotoğrafı)
3. Kendi referans fotoğraflarından birini seç
4. Generate butonuna bas
5. Oluşturma süreci (30-40 saniye)
6. Sonuç ekranında görsel görüntüle
7. İndir veya paylaş

### Akış 3: Referans Fotoğraf Yönetimi
1. Profil → Referans Fotoğraflarım
2. Mevcut referansları görüntüle
3. Yeni referans fotoğraf ekle veya mevcut olanı sil
4. Değişiklikleri kaydet

## Renk Seçimleri

Content Queen, modern, sofistike ve premium bir hissiyat oluşturmak için aşağıdaki renk paletini kullanır:

| Renk | Hex | Kullanım |
|------|-----|----------|
| **Birincil Pembe** | #E94B8F | Butonlar, CTA, vurgular |
| **Koyu Arka Plan** | #0F0F0F | Ana arka plan (dark mode) |
| **Açık Arka Plan** | #FFFFFF | Ana arka plan (light mode) |
| **Gümüş Gri** | #F5F5F5 | Kartlar, yüzeyler (light mode) |
| **Koyu Gri** | #1E1E1E | Kartlar, yüzeyler (dark mode) |
| **Metin Birincil** | #000000 | Ana metin (light mode) |
| **Metin Birincil** | #FFFFFF | Ana metin (dark mode) |
| **Metin İkincil** | #666666 | İkincil metin, açıklamalar |
| **Başarı Yeşili** | #34C759 | Başarı durumları |
| **Hata Kırmızısı** | #FF3B30 | Hata mesajları |
| **Uyarı Sarısı** | #FF9500 | Uyarı mesajları |

## Tipografi

- **Başlıklar:** SF Pro Display, 28-32pt, Bold
- **Alt Başlıklar:** SF Pro Display, 18-22pt, Semibold
- **Gövde Metni:** SF Pro Text, 16-17pt, Regular
- **Küçük Metin:** SF Pro Text, 12-14pt, Regular
- **Buton Metni:** SF Pro Display, 16-17pt, Semibold

## Animasyon ve Etkileşim

- **Buton Basış:** 0.97 ölçek ve hafif haptic feedback
- **Geçişler:** 250ms fade-in/fade-out
- **Yükleme Göstergesi:** Dönen spinner, 1 saniye döngü
- **Hata Mesajları:** 300ms slide-in animasyonu
- **Başarı Mesajları:** 200ms scale-up animasyonu, 2 saniye sonra fade-out

## Erişilebilirlik

- Tüm butonlar minimum 44x44pt dokunma alanı
- Yüksek kontrast oranları (WCAG AA standartları)
- VoiceOver desteği tüm öğeler için
- Dinamik Yazı Tipi desteği
- Koyu mod tam desteği
