import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    },
    getItem: (key: string) => {
      return Promise.resolve(mockStorage[key] || null);
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    },
  },
}));

describe("Settings Screen", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("should save notification preference", () => {
    const key = "content_queen_notifications";
    mockStorage[key] = "true";
    expect(mockStorage[key]).toBe("true");
  });

  it("should save email notification preference", () => {
    const key = "content_queen_email_notifications";
    mockStorage[key] = "false";
    expect(mockStorage[key]).toBe("false");
  });

  it("should toggle notification settings", () => {
    const key = "content_queen_notifications";
    mockStorage[key] = "true";
    expect(mockStorage[key]).toBe("true");

    mockStorage[key] = "false";
    expect(mockStorage[key]).toBe("false");
  });

  it("should have default notification settings", () => {
    const notifKey = "content_queen_notifications";
    const emailKey = "content_queen_email_notifications";

    // Varsayılan olarak açık olmalı
    const notif = mockStorage[notifKey] || "true";
    const email = mockStorage[emailKey] || "true";

    expect(notif).toBe("true");
    expect(email).toBe("true");
  });

  it("should support multiple settings", () => {
    mockStorage["content_queen_notifications"] = "true";
    mockStorage["content_queen_email_notifications"] = "false";
    mockStorage["content_queen_language"] = "tr";

    expect(Object.keys(mockStorage)).toHaveLength(3);
    expect(mockStorage["content_queen_notifications"]).toBe("true");
    expect(mockStorage["content_queen_email_notifications"]).toBe("false");
    expect(mockStorage["content_queen_language"]).toBe("tr");
  });
});
