import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenHeader } from "@/components/screen-header";
import { useColors } from "@/hooks/use-colors";

export default function PrivacyPolicyScreen() {
  const colors = useColors();

  return (
    <ScreenContainer>
      <ScreenHeader title="Gizlilik Politikası" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground, marginBottom: 4 }}>
          Gizlilik Politikası
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 24 }}>
          Son güncelleme: 11 Nisan 2026
        </Text>

        <Section title="1. Veri Sorumlusu">
          TrairX Technology O.Ü. ("Şirket"), Estonya yasalarına göre kurulmuş bir şirket olup,
          Content Queen uygulaması ("Uygulama") aracılığıyla toplanan kişisel verilerin
          işlenmesinden sorumludur.
        </Section>

        <Section title="2. Toplanan Veriler">
          Uygulamamız aşağıdaki kişisel verileri toplar:{"\n\n"}
          • Telefon numarası (kimlik doğrulama amacıyla){"\n"}
          • Yüklenen fotoğraflar (referans ve içerik görselleri){"\n"}
          • Oluşturulan görseller ve ilgili meta veriler{"\n"}
          • Cihaz bilgileri (işletim sistemi, cihaz modeli){"\n"}
          • Uygulama kullanım verileri ve tercihler{"\n"}
          • Push bildirim token'ları
        </Section>

        <Section title="3. Verilerin İşlenme Amaçları">
          Kişisel verileriniz aşağıdaki amaçlarla işlenir:{"\n\n"}
          • Hesap oluşturma ve kimlik doğrulama{"\n"}
          • Yapay zeka destekli görsel oluşturma hizmetinin sunulması{"\n"}
          • Abonelik ve kredi yönetimi{"\n"}
          • Push bildirimleri gönderimi{"\n"}
          • Hizmet kalitesinin iyileştirilmesi{"\n"}
          • Yasal yükümlülüklerin yerine getirilmesi
        </Section>

        <Section title="4. Verilerin Saklanması">
          Fotoğraflarınız ve oluşturulan görseller, güvenli bulut sunucularında (AWS)
          şifrelenmiş olarak saklanır. Hesabınızı sildiğinizde tüm kişisel verileriniz
          30 gün içinde kalıcı olarak silinir.
        </Section>

        <Section title="5. Üçüncü Taraf Hizmetler">
          Hizmetimizi sunmak için aşağıdaki üçüncü taraf sağlayıcıları kullanıyoruz:{"\n\n"}
          • Twilio — SMS doğrulama hizmeti{"\n"}
          • Replicate — Yapay zeka görsel oluşturma{"\n"}
          • Firebase — Push bildirim hizmeti{"\n"}
          • Amazon Web Services — Veri depolama{"\n\n"}
          Bu sağlayıcılar yalnızca hizmet sunumu için gerekli verilere erişir ve
          kendi gizlilik politikalarına tabidir.
        </Section>

        <Section title="6. Veri Güvenliği">
          Verilerinizi korumak için endüstri standardı güvenlik önlemleri uyguluyoruz:{"\n\n"}
          • TLS/SSL şifreleme ile veri iletimi{"\n"}
          • Sunucu tarafında AES-256 şifreleme{"\n"}
          • Düzenli güvenlik denetimleri{"\n"}
          • Erişim kontrolü ve yetkilendirme mekanizmaları
        </Section>

        <Section title="7. Kullanıcı Hakları">
          Avrupa Birliği Genel Veri Koruma Tüzüğü (GDPR) ve Estonya veri koruma
          mevzuatı kapsamında aşağıdaki haklara sahipsiniz:{"\n\n"}
          • Verilerinize erişim hakkı{"\n"}
          • Verilerin düzeltilmesini talep etme hakkı{"\n"}
          • Verilerin silinmesini talep etme hakkı (unutulma hakkı){"\n"}
          • Veri işlemeyi kısıtlama hakkı{"\n"}
          • Veri taşınabilirliği hakkı{"\n"}
          • İtiraz hakkı{"\n\n"}
          Bu haklarınızı kullanmak için privacy@trairx.com adresine başvurabilirsiniz.
        </Section>

        <Section title="8. Çerezler ve İzleme">
          Uygulamamız oturum yönetimi için çerezler kullanır. Analitik veya
          reklam amaçlı üçüncü taraf çerezleri kullanılmamaktadır.
        </Section>

        <Section title="9. Çocukların Gizliliği">
          Uygulamamız 16 yaşın altındaki bireylere yönelik değildir. Bilerek
          16 yaşın altındaki bireylerden kişisel veri toplamıyoruz.
        </Section>

        <Section title="10. Politika Değişiklikleri">
          Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler
          uygulama içi bildirim ile duyurulacaktır.
        </Section>

        <Section title="11. İletişim">
          Gizlilik ile ilgili sorularınız için:{"\n\n"}
          TrairX Technology O.Ü.{"\n"}
          E-posta: privacy@trairx.com{"\n"}
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
