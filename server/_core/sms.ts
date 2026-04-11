/**
 * Twilio Verify API integration for phone OTP.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_VERIFY_SERVICE_SID
 */

const accountSid = () => process.env.TWILIO_ACCOUNT_SID!;
const authToken = () => process.env.TWILIO_AUTH_TOKEN!;
const serviceSid = () => process.env.TWILIO_VERIFY_SERVICE_SID!;

function authHeader(): string {
  return "Basic " + Buffer.from(`${accountSid()}:${authToken()}`).toString("base64");
}

const BASE = "https://verify.twilio.com/v2";

/**
 * Send OTP via Twilio Verify
 */
export async function sendVerification(phone: string): Promise<{ success: boolean; error?: string }> {
  // Development fallback — Twilio credentials yoksa console'a logla
  if (!accountSid() || !serviceSid()) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`\n📱 [DEV OTP → ${phone}] Kod: ${code}\n`);
    // Dev modda kodu global'e kaydet ki verify'da kontrol edebilelim
    (globalThis as any).__devOtpCodes = (globalThis as any).__devOtpCodes || {};
    (globalThis as any).__devOtpCodes[phone] = code;
    return { success: true };
  }

  try {
    const url = `${BASE}/Services/${serviceSid()}/Verifications`;
    const body = new URLSearchParams({ To: phone, Channel: "sms" });

    console.log("[Twilio Verify] Sending to:", phone, "URL:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json().catch(() => ({}));
    console.log("[Twilio Verify] Send response:", res.status, data);

    if (!res.ok) {
      console.error("[Twilio Verify] Send error:", data);
      return { success: false, error: (data as any).message || "SMS gönderilemedi" };
    }

    return { success: true };
  } catch (error) {
    console.error("[Twilio Verify] Send exception:", error);
    return { success: false, error: "SMS servisi hatası" };
  }
}

/**
 * Check OTP via Twilio Verify
 */
export async function checkVerification(
  phone: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  // Development fallback
  if (!accountSid() || !serviceSid()) {
    const devCodes = (globalThis as any).__devOtpCodes || {};
    if (devCodes[phone] === code) {
      delete devCodes[phone];
      return { success: true };
    }
    return { success: false, error: "Doğrulama kodu hatalı" };
  }

  try {
    const url = `${BASE}/Services/${serviceSid()}/VerificationCheck`;
    const body = new URLSearchParams({ To: phone, Code: code });

    console.log("[Twilio Verify] Checking:", phone, "Code:", code, "URL:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json();
    console.log("[Twilio Verify] Check response:", res.status, JSON.stringify(data));

    if (!res.ok) {
      console.error("[Twilio Verify] Check error:", data);
      return { success: false, error: (data as any).message || "Doğrulama başarısız" };
    }

    if ((data as any).status === "approved") {
      return { success: true };
    }

    return { success: false, error: "Doğrulama kodu hatalı" };
  } catch (error) {
    console.error("[Twilio Verify] Check exception:", error);
    return { success: false, error: "Doğrulama servisi hatası" };
  }
}
