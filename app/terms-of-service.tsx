import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useColors } from "@/hooks/use-colors";

export default function TermsOfServiceScreen() {
  const colors = useColors();

  return (
    <ScreenContainer>
      <ScreenHeader title="Kullanım Şartları" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground, marginBottom: 4 }}>
          Kullanım Şartları
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 24 }}>
          Son güncelleme: 11 Nisan 2026
        </Text>

        <Section title="1. Taraflar">
          Bu kullanım şartları ("Şartlar"), TrairX Technology O.Ü. ("Şirket", "biz")
          ile Content Queen uygulamasını ("Uygulama") kullanan siz ("Kullanıcı")
          arasındaki sözleşmeyi oluşturur. Şirket, Estonya Cumhuriyeti yasalarına
          göre kurulmuş ve faaliyet göstermektedir.
        </Section>

        <Section title="2. Hizmet Tanımı">
          Content Queen, yapay zeka teknolojisi kullanarak kullanıcıların referans
          fotoğraflarından profesyonel görseller oluşturmasını sağlayan bir mobil
          uygulamadır. Hizmet, kredi tabanlı bir sistem üzerinden sunulmaktadır.
        </Section>

        <Section title="3. Hesap Oluşturma">
          Uygulamayı kullanmak için telefon numaranız ile kayıt olmanız gerekmektedir.
          Hesabınızın güvenliğinden siz sorumlusunuz. Hesabınızda yetkisiz erişim
          tespit ettiğinizde derhal bizi bilgilendirmelisiniz.
        </Section>

        <Section title="4. Kredi Sistemi ve Ödeme">
          • Her görsel oluşturma işlemi belirli miktarda kredi harcar{"\n"}
          • Yeni kullanıcılara ücretsiz deneme kredisi verilir{"\n"}
          • Ek krediler uygulama içi satın alma ile edinilebilir{"\n"}
          • Satın alınan krediler iade edilmez{"\n"}
          • Kullanılmayan kredilerin süresi dolmaz
        </Section>

        <Section title="5. Kullanım Kuralları">
          Uygulamayı kullanırken aşağıdaki kurallara uymayı kabul edersiniz:{"\n\n"}
          • Yalnızca kullanım hakkına sahip olduğunuz fotoğrafları yüklemek{"\n"}
          • Yasadışı, müstehcen veya zararlı içerik oluşturmamak{"\n"}
          • Başkalarının kişilik haklarını ihlal etmemek{"\n"}
          • Uygulamayı tersine mühendislik yapmamak veya kötüye kullanmamak{"\n"}
          • Otomatik araçlar veya botlar kullanmamak
        </Section>

        <Section title="6. Fikri Mülkiyet">
          • Yüklediğiniz orijinal fotoğrafların hakları size aittir{"\n"}
          • Uygulama tarafından oluşturulan görsellerin kullanım hakkı size aittir{"\n"}
          • Content Queen markası, logosu ve yazılımı Şirket'in mülkiyetindedir{"\n"}
          • Oluşturulan görselleri ticari amaçla kullanabilirsiniz
        </Section>

        <Section title="7. Yapay Zeka ve İçerik">
          • Oluşturulan görseller yapay zeka tarafından üretilir ve sonuçlar değişkenlik gösterebilir{"\n"}
          • Şirket, oluşturulan görsellerin kalitesi veya uygunluğu konusunda garanti vermez{"\n"}
          • Uygunsuz içerik tespit edildiğinde hesabınız askıya alınabilir
        </Section>

        <Section title="8. Hizmet Sürekliliği">
          • Hizmeti önceden bildirimde bulunarak geçici olarak askıya alabiliriz{"\n"}
          • Bakım ve güncelleme nedeniyle kesintiler yaşanabilir{"\n"}
          • Hizmeti tamamen sonlandırmamız durumunda 30 gün önceden bildirim yapılır
        </Section>

        <Section title="9. Sorumluluk Sınırlaması">
          Şirket, uygulamanın kullanımından doğabilecek doğrudan veya dolaylı
          zararlardan sorumlu tutulamaz. Hizmet "olduğu gibi" sunulmaktadır.
          Azami sorumluluk, kullanıcının son 12 ayda ödediği toplam tutarla sınırlıdır.
        </Section>

        <Section title="10. Hesap Silme">
          Hesabınızı istediğiniz zaman uygulama ayarlarından silebilirsiniz.
          Hesap silme işlemi sonrasında:{"\n\n"}
          • Tüm kişisel verileriniz 30 gün içinde silinir{"\n"}
          • Oluşturulan görseller kalıcı olarak kaldırılır{"\n"}
          • Kullanılmamış krediler iade edilmez
        </Section>

        <Section title="11. Uygulanacak Hukuk">
          Bu şartlar Estonya Cumhuriyeti yasalarına tabidir. Uyuşmazlıklar
          öncelikle dostane çözüm yoluyla, aksi halde Estonya mahkemelerinde
          çözümlenecektir.
        </Section>

        <Section title="12. Şartlarda Değişiklik">
          Bu şartları zaman zaman güncelleyebiliriz. Önemli değişiklikler
          uygulama içi bildirim ile en az 14 gün önceden duyurulacaktır.
          Değişiklik sonrası uygulamayı kullanmaya devam etmeniz, yeni
          şartları kabul ettiğiniz anlamına gelir.
        </Section>

        <Section title="13. İletişim">
          Sorularınız için:{"\n\n"}
          TrairX Technology O.Ü.{"\n"}
          E-posta: legal@trairx.com{"\n"}
          Ülke: Estonya
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#000", marginBottom: 6 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>{children}</Text>
    </View>
  );
}
