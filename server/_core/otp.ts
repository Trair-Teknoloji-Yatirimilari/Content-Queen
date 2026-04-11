/**
 * OTP service — thin wrapper around Twilio Verify.
 * Handles phone normalization and delegates to sms.ts.
 */
import { sendVerification, checkVerification } from "./sms";

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "+90" + cleaned.slice(1);
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+90" + cleaned;
  }
  return cleaned;
}

export async function sendOtp(rawPhone: string): Promise<{ success: boolean; error?: string }> {
  const phone = normalizePhone(rawPhone);

  if (!/^\+90[0-9]{10}$/.test(phone)) {
    return { success: false, error: "Geçersiz telefon numarası" };
  }

  return sendVerification(phone);
}

export async function verifyOtp(
  rawPhone: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const phone = normalizePhone(rawPhone);
  return checkVerification(phone, code);
}

export { normalizePhone };
