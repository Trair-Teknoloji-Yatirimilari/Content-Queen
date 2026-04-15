/**
 * Professional Image Processing Utilities
 * Orijinal görsel boyutlarını koruyarak face swap pipeline'ını destekler.
 */

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * URL'den görselin boyutlarını al
 */
export async function getImageDimensions(imageUrl: string): Promise<ImageDimensions> {
  const sharp = (await import("sharp")).default;
  const res = await fetch(imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  return { width: metadata.width || 0, height: metadata.height || 0 };
}

/**
 * Görseli kare padding ile genişlet (face swap için).
 * Dikey görseli kare yapar, üst/alt siyah padding ekler.
 * Kare veya yatay görselleri olduğu gibi bırakır.
 * Returns: padded image buffer + orijinal boyutlar
 */
export async function padToSquare(imageUrl: string): Promise<{
  buffer: Buffer;
  original: ImageDimensions;
  padded: ImageDimensions;
  paddingTop: number;
  paddingLeft: number;
}> {
  const sharp = (await import("sharp")).default;
  const res = await fetch(imageUrl);
  const inputBuffer = Buffer.from(await res.arrayBuffer());
  const metadata = await sharp(inputBuffer).metadata();

  const w = metadata.width || 0;
  const h = metadata.height || 0;
  const maxDim = Math.max(w, h);

  const paddingTop = Math.floor((maxDim - h) / 2);
  const paddingLeft = Math.floor((maxDim - w) / 2);

  const paddedBuffer = await sharp(inputBuffer)
    .extend({
      top: paddingTop,
      bottom: maxDim - h - paddingTop,
      left: paddingLeft,
      right: maxDim - w - paddingLeft,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .jpeg({ quality: 95 })
    .toBuffer();

  return {
    buffer: paddedBuffer,
    original: { width: w, height: h },
    padded: { width: maxDim, height: maxDim },
    paddingTop,
    paddingLeft,
  };
}

/**
 * Kare padding'i kaldırıp orijinal boyuta geri dön.
 */
export async function removePadding(
  imageUrl: string,
  original: ImageDimensions,
  paddingTop: number,
  paddingLeft: number,
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const res = await fetch(imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());

  const cropped = await sharp(buffer)
    .extract({
      left: paddingLeft,
      top: paddingTop,
      width: original.width,
      height: original.height,
    })
    .jpeg({ quality: 95 })
    .toBuffer();

  return cropped;
}

/**
 * Buffer'ı geçici URL'ye yükle (Supabase)
 */
export async function uploadBuffer(buffer: Buffer, userId: number, prefix: string): Promise<string> {
  const { storagePut } = await import("./storage");
  const key = `${userId}/${prefix}/${Date.now()}.jpg`;
  const { url } = await storagePut(key, buffer, "image/jpeg");
  return url;
}
