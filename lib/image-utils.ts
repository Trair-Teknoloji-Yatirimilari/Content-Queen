/**
 * Image download, save and share utilities.
 * Uses expo-file-system (SDK 54 new API) + expo-media-library + expo-sharing.
 */
import { File, Paths } from "expo-file-system/next";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Share, Platform } from "react-native";

/**
 * Download a remote image to local cache and return the File instance.
 */
export async function downloadImage(url: string): Promise<File> {
  const fileName = `content-queen-${Date.now()}.jpg`;
  const file = new File(Paths.cache, fileName);

  // expo/fetch ile indir, File blob uyumlu
  const response = await fetch(url);
  const text = await response.text();

  // Base64 olarak kaydet (en güvenilir yol RN'de)
  // URL'den gelen veriyi string olarak alıp dosyaya yazıyoruz
  file.write(text);

  return file;
}

/**
 * Download remote image via base64 approach (most reliable in RN).
 */
export async function downloadImageAsBase64(url: string): Promise<{ uri: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] || "";

        // File'a yaz
        const fileName = `content-queen-${Date.now()}.jpg`;
        const file = new File(Paths.cache, fileName);
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        file.write(bytes);

        resolve({ uri: file.uri, base64 });
      };
      reader.onerror = reject;
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = () => reject(new Error("Download failed"));
    xhr.responseType = "blob";
    xhr.open("GET", url, true);
    xhr.send();
  });
}

/**
 * Save an image URL to the device's photo gallery.
 */
export async function saveImageToGallery(url: string): Promise<boolean> {
  try {
    const { uri } = await downloadImageAsBase64(url);

    // MediaLibrary dene (development build'de çalışır)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        await MediaLibrary.saveToLibraryAsync(uri);
        return true;
      }
    } catch {
      // Expo Go'da kısıtlı — sessizce fallback'e geç
    }

    // Fallback: sharing menüsünden kaydetsin
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: "image/jpeg" });
      return true;
    }

    return false;
  } catch (error) {
    console.error("[ImageUtils] Save failed:", error);
    return false;
  }
}

/**
 * Share an image URL via native share sheet.
 */
export async function shareImage(url: string): Promise<boolean> {
  try {
    const { uri } = await downloadImageAsBase64(url);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "image/jpeg",
        dialogTitle: "Content Queen Görseli",
      });
      return true;
    }

    // Fallback: native Share API
    await Share.share(
      Platform.OS === "ios"
        ? { url }
        : { message: `Content Queen ile oluşturdum ✨\n${url}` },
    );
    return true;
  } catch (error) {
    console.error("[ImageUtils] Share failed:", error);
    return false;
  }
}


/**
 * Share image directly to Instagram Stories (premium feature).
 * Uses Instagram's custom URL scheme.
 */
export async function shareToInstagramStories(url: string): Promise<boolean> {
  try {
    const { uri } = await downloadImageAsBase64(url);

    if (Platform.OS === "ios") {
      const Linking = await import("expo-linking");

      // Instagram Stories URL scheme
      // Requires the image to be in the pasteboard
      const canOpen = await Linking.canOpenURL("instagram-stories://share");
      if (!canOpen) {
        return false;
      }

      // iOS: Use Sharing to send to Instagram
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/jpeg",
          UTI: "com.instagram.sharedSticker.backgroundImage",
        });
        return true;
      }
    }

    // Fallback: open Instagram with share sheet
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: "image/jpeg" });
      return true;
    }

    return false;
  } catch (error) {
    console.error("[ImageUtils] Instagram share failed:", error);
    return false;
  }
}

/**
 * Check if Instagram is installed.
 */
export async function isInstagramInstalled(): Promise<boolean> {
  try {
    const Linking = await import("expo-linking");
    return await Linking.canOpenURL("instagram://");
  } catch {
    return false;
  }
}
