/**
 * Security & Abuse Prevention Tests
 * Bu testler sunucuya karşı çalışır — EXPO_PUBLIC_API_BASE_URL ayarlı olmalı.
 */
import { describe, it, expect } from "vitest";

const API = process.env.EXPO_PUBLIC_API_BASE_URL || "https://contentqueen.com.tr";
const TEST_PHONE = "05550000000";
const TEST_CODE = "123456";

async function getTestToken(): Promise<string> {
  await fetch(`${API}/api/trpc/auth.sendOtp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { phone: TEST_PHONE } }),
  });

  const res = await fetch(`${API}/api/trpc/auth.verifyOtp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { phone: TEST_PHONE, code: TEST_CODE } }),
  });

  const data = await res.json();
  return data.result.data.json.sessionToken;
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

describe("Security Tests", () => {
  // ─── Auth ───
  it("should reject invalid OTP code", async () => {
    await fetch(`${API}/api/trpc/auth.sendOtp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { phone: TEST_PHONE } }),
    });

    const res = await fetch(`${API}/api/trpc/auth.verifyOtp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { phone: TEST_PHONE, code: "000000" } }),
    });

    const data = await res.json();
    expect(data.result.data.json.success).toBe(false);
  });

  it("should reject requests without auth token", async () => {
    const res = await fetch(`${API}/api/trpc/credits.getCredits`, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("should reject invalid auth token", async () => {
    const res = await fetch(`${API}/api/trpc/credits.getCredits`, {
      headers: { "Content-Type": "application/json", Authorization: "Bearer invalid_token_123" },
    });
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  // ─── Webhook ───
  it("should accept webhook with valid payload", async () => {
    const res = await fetch(`${API}/api/webhooks/replicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "test-fake-id", status: "succeeded", output: ["https://example.com/img.webp"] }),
    });
    // Should return 200 (unknown ID but valid format)
    expect(res.status).toBe(200);
  });

  // ─── Credits ───
  it("should not allow negative credit amounts", async () => {
    const token = await getTestToken();
    const res = await fetch(`${API}/api/trpc/credits.addCredits`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ json: { amount: -100 } }),
    });
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("should not allow zero credit amounts", async () => {
    const token = await getTestToken();
    const res = await fetch(`${API}/api/trpc/credits.addCredits`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ json: { amount: 0 } }),
    });
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  // ─── Training Limits ───
  it("should return training limit info", async () => {
    const token = await getTestToken();
    const res = await fetch(`${API}/api/trpc/training.status`, {
      headers: authHeaders(token),
    });
    const data = await res.json();
    const status = data.result.data.json;
    expect(status.trainingsMax).toBeGreaterThan(0);
    expect(status.trainingsRemaining).toBeDefined();
    expect(status.trainingsUsed).toBeDefined();
  });

  // ─── Photo Upload Limits ───
  it("should reject oversized photo upload", async () => {
    const token = await getTestToken();
    // 15MB fake base64
    const bigBase64 = "A".repeat(15 * 1024 * 1024);
    const res = await fetch(`${API}/api/trpc/referencePhotos.upload`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ json: { base64: bigBase64, photoType: "content", fileName: "big.jpg" } }),
    });
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  // ─── Showcase ───
  it("should not allow adding non-existent image to showcase", async () => {
    const token = await getTestToken();
    const res = await fetch(`${API}/api/trpc/showcase.add`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ json: { generatedImageId: 999999 } }),
    });
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  // ─── Health ───
  it("should return healthy status", async () => {
    const res = await fetch(`${API}/api/health`);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
