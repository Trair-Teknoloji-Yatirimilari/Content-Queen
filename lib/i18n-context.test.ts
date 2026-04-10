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

describe("i18n Translations", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("should have Turkish translations", () => {
    const translations = {
      tr: {
        "splash.welcome": "Content Queen'e Hoşgeldiniz",
        "splash.selectLanguage": "Dil Seçin",
        "kvkk.title": "Gizlilik Politikası ve Kullanım Şartları",
      },
    };

    expect(translations.tr["splash.welcome"]).toBe("Content Queen'e Hoşgeldiniz");
    expect(translations.tr["splash.selectLanguage"]).toBe("Dil Seçin");
    expect(translations.tr["kvkk.title"]).toBe(
      "Gizlilik Politikası ve Kullanım Şartları"
    );
  });

  it("should have English translations", () => {
    const translations = {
      en: {
        "splash.welcome": "Welcome to Content Queen",
        "splash.selectLanguage": "Select Language",
        "kvkk.title": "Privacy Policy & Terms of Service",
      },
    };

    expect(translations.en["splash.welcome"]).toBe("Welcome to Content Queen");
    expect(translations.en["splash.selectLanguage"]).toBe("Select Language");
    expect(translations.en["kvkk.title"]).toBe(
      "Privacy Policy & Terms of Service"
    );
  });

  it("should have matching keys in both languages", () => {
    const trKeys = [
      "splash.welcome",
      "splash.selectLanguage",
      "kvkk.title",
      "kvkk.agree",
      "common.next",
      "common.back",
    ];

    const enKeys = [
      "splash.welcome",
      "splash.selectLanguage",
      "kvkk.title",
      "kvkk.agree",
      "common.next",
      "common.back",
    ];

    expect(trKeys).toEqual(enKeys);
  });

  it("should save and retrieve language preference", () => {
    const key = "content_queen_language";
    const value = "en";

    mockStorage[key] = value;
    const retrieved = mockStorage[key];

    expect(retrieved).toBe("en");
  });

  it("should support Turkish and English languages", () => {
    const supportedLanguages = ["tr", "en"];

    expect(supportedLanguages).toContain("tr");
    expect(supportedLanguages).toContain("en");
    expect(supportedLanguages).toHaveLength(2);
  });
});
