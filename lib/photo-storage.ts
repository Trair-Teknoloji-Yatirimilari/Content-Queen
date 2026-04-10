import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StoredPhoto {
  id: string;
  uri: string;
  timestamp: number;
  type: "reference" | "content";
}

const REFERENCE_PHOTOS_KEY = "content_queen_reference_photos";
const CONTENT_PHOTOS_KEY = "content_queen_content_photos";

/**
 * Referans fotoğraflarını AsyncStorage'da yönet
 */
export const photoStorage = {
  /**
   * Referans fotoğrafı kaydet
   */
  async saveReferencePhoto(uri: string): Promise<StoredPhoto> {
    const photo: StoredPhoto = {
      id: `ref_${Date.now()}`,
      uri,
      timestamp: Date.now(),
      type: "reference",
    };

    try {
      const existing = await this.getReferencePhotos();
      const updated = [...existing, photo];
      await AsyncStorage.setItem(REFERENCE_PHOTOS_KEY, JSON.stringify(updated));
      return photo;
    } catch (error) {
      console.error("Referans fotoğrafı kaydetme hatası:", error);
      throw error;
    }
  },

  /**
   * Tüm referans fotoğraflarını al
   */
  async getReferencePhotos(): Promise<StoredPhoto[]> {
    try {
      const data = await AsyncStorage.getItem(REFERENCE_PHOTOS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Referans fotoğrafları alma hatası:", error);
      return [];
    }
  },

  /**
   * Referans fotoğrafını sil
   */
  async deleteReferencePhoto(id: string): Promise<void> {
    try {
      const photos = await this.getReferencePhotos();
      const filtered = photos.filter((p) => p.id !== id);
      await AsyncStorage.setItem(REFERENCE_PHOTOS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("Referans fotoğrafı silme hatası:", error);
      throw error;
    }
  },

  /**
   * İçerik referansı fotoğrafı kaydet
   */
  async saveContentPhoto(uri: string): Promise<StoredPhoto> {
    const photo: StoredPhoto = {
      id: `content_${Date.now()}`,
      uri,
      timestamp: Date.now(),
      type: "content",
    };

    try {
      const existing = await this.getContentPhotos();
      const updated = [...existing, photo];
      await AsyncStorage.setItem(CONTENT_PHOTOS_KEY, JSON.stringify(updated));
      return photo;
    } catch (error) {
      console.error("İçerik fotoğrafı kaydetme hatası:", error);
      throw error;
    }
  },

  /**
   * Tüm içerik fotoğraflarını al
   */
  async getContentPhotos(): Promise<StoredPhoto[]> {
    try {
      const data = await AsyncStorage.getItem(CONTENT_PHOTOS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("İçerik fotoğrafları alma hatası:", error);
      return [];
    }
  },

  /**
   * İçerik fotoğrafını sil
   */
  async deleteContentPhoto(id: string): Promise<void> {
    try {
      const photos = await this.getContentPhotos();
      const filtered = photos.filter((p) => p.id !== id);
      await AsyncStorage.setItem(CONTENT_PHOTOS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error("İçerik fotoğrafı silme hatası:", error);
      throw error;
    }
  },

  /**
   * Tüm fotoğrafları temizle
   */
  async clearAllPhotos(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([REFERENCE_PHOTOS_KEY, CONTENT_PHOTOS_KEY]);
    } catch (error) {
      console.error("Fotoğrafları temizleme hatası:", error);
      throw error;
    }
  },

  /**
   * Depolama istatistiklerini al
   */
  async getStorageStats(): Promise<{ referenceCount: number; contentCount: number }> {
    const reference = await this.getReferencePhotos();
    const content = await this.getContentPhotos();
    return {
      referenceCount: reference.length,
      contentCount: content.length,
    };
  },
};
