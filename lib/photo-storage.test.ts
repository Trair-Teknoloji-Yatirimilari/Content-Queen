import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { photoStorage } from "./photo-storage";

// AsyncStorage mock
const mockStorage: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: async (key: string, value: string) => {
      mockStorage[key] = value;
    },
    getItem: async (key: string) => {
      return mockStorage[key] || null;
    },
    removeItem: async (key: string) => {
      delete mockStorage[key];
    },
    multiRemove: async (keys: string[]) => {
      keys.forEach((key) => delete mockStorage[key]);
    },
  },
}));

describe("Photo Storage Service", () => {
  beforeEach(() => {
    // Testler öncesi tüm verileri temizle
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  afterEach(() => {
    // Testler sonrası tüm verileri temizle
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("should save and retrieve reference photos", async () => {
    const uri = "file:///path/to/photo.jpg";

    // Fotoğraf kaydet
    const saved = await photoStorage.saveReferencePhoto(uri);
    expect(saved).toBeDefined();
    expect(saved.id).toBeDefined();
    expect(saved.uri).toBe(uri);
    expect(saved.type).toBe("reference");

    // Kaydedilen fotoğrafları al
    const photos = await photoStorage.getReferencePhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0].uri).toBe(uri);
  });

  it("should save and retrieve content photos", async () => {
    const uri = "file:///path/to/content.jpg";

    // Fotoğraf kaydet
    const saved = await photoStorage.saveContentPhoto(uri);
    expect(saved).toBeDefined();
    expect(saved.type).toBe("content");

    // Kaydedilen fotoğrafları al
    const photos = await photoStorage.getContentPhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0].uri).toBe(uri);
  });

  it("should delete reference photos", async () => {
    const uri = "file:///path/to/photo.jpg";

    // Fotoğraf kaydet
    const saved = await photoStorage.saveReferencePhoto(uri);

    // Fotoğrafı sil
    await photoStorage.deleteReferencePhoto(saved.id);

    // Silinen fotoğraf artık yok
    const photos = await photoStorage.getReferencePhotos();
    expect(photos).toHaveLength(0);
  });

  it("should delete content photos", async () => {
    const uri = "file:///path/to/content.jpg";

    // Fotoğraf kaydet
    const saved = await photoStorage.saveContentPhoto(uri);

    // Fotoğrafı sil
    await photoStorage.deleteContentPhoto(saved.id);

    // Silinen fotoğraf artık yok
    const photos = await photoStorage.getContentPhotos();
    expect(photos).toHaveLength(0);
  });

  it("should handle multiple photos", async () => {
    const uris = [
      "file:///path/to/photo1.jpg",
      "file:///path/to/photo2.jpg",
      "file:///path/to/photo3.jpg",
    ];

    // Birden fazla fotoğraf kaydet
    for (const uri of uris) {
      await photoStorage.saveReferencePhoto(uri);
    }

    // Tüm fotoğrafları al
    const photos = await photoStorage.getReferencePhotos();
    expect(photos).toHaveLength(3);
  });

  it("should get storage stats", async () => {
    // Referans fotoğrafları kaydet
    await photoStorage.saveReferencePhoto("file:///ref1.jpg");
    await photoStorage.saveReferencePhoto("file:///ref2.jpg");

    // İçerik fotoğrafları kaydet
    await photoStorage.saveContentPhoto("file:///content1.jpg");

    // İstatistikleri al
    const stats = await photoStorage.getStorageStats();
    expect(stats.referenceCount).toBe(2);
    expect(stats.contentCount).toBe(1);
  });

  it("should clear all photos", async () => {
    // Fotoğrafları kaydet
    await photoStorage.saveReferencePhoto("file:///ref.jpg");
    await photoStorage.saveContentPhoto("file:///content.jpg");

    // Tüm fotoğrafları temizle
    await photoStorage.clearAllPhotos();

    // Hiç fotoğraf kalmaması gerekir
    const refPhotos = await photoStorage.getReferencePhotos();
    const contentPhotos = await photoStorage.getContentPhotos();
    expect(refPhotos).toHaveLength(0);
    expect(contentPhotos).toHaveLength(0);
  });

  it("should return empty array for non-existent photos", async () => {
    const refPhotos = await photoStorage.getReferencePhotos();
    const contentPhotos = await photoStorage.getContentPhotos();

    expect(refPhotos).toEqual([]);
    expect(contentPhotos).toEqual([]);
  });

  it("should preserve photo order", async () => {
    const uris = ["file:///1.jpg", "file:///2.jpg", "file:///3.jpg"];

    // Fotoğrafları sırasıyla kaydet
    for (const uri of uris) {
      await photoStorage.saveReferencePhoto(uri);
    }

    // Kaydedilen fotoğrafları al
    const photos = await photoStorage.getReferencePhotos();

    // Sıra korunmuş olmalı
    expect(photos[0].uri).toBe(uris[0]);
    expect(photos[1].uri).toBe(uris[1]);
    expect(photos[2].uri).toBe(uris[2]);
  });
});
