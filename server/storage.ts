/**
 * Supabase Storage — file upload/download for Content Queen.
 *
 * Env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_STORAGE_BUCKET (default: "content-queen")
 */
import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "content-queen";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Dosya yükle ve public URL döndür.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const supabase = getClient();
  const key = relKey.replace(/^\/+/, "");

  // Buffer'ı Uint8Array'e çevir (Supabase SDK uyumluluğu)
  const fileData = typeof data === "string"
    ? new TextEncoder().encode(data)
    : data instanceof Buffer
      ? new Uint8Array(data)
      : data;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, fileData, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error("[Storage] Upload hatası:", error);
    throw new Error(`Dosya yüklenemedi: ${error.message}`);
  }

  // Public URL al
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(key);

  return { key, url: urlData.publicUrl };
}

/**
 * Dosyanın public URL'ini döndür.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const supabase = getClient();
  const key = relKey.replace(/^\/+/, "");

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(key);

  return { key, url: data.publicUrl };
}

/**
 * Dosya sil.
 */
export async function storageDelete(relKey: string): Promise<void> {
  const supabase = getClient();
  const key = relKey.replace(/^\/+/, "");

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([key]);

  if (error) {
    console.error("[Storage] Silme hatası:", error);
  }
}
