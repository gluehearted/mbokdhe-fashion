import sharp from "sharp";
import { CrmError, MAX_PHOTO_BYTES } from "./contracts";

export async function sanitizePhoto(bytes: Buffer): Promise<Buffer> {
  try {
    if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new Error("size");
    const image = sharp(bytes, { limitInputPixels: 16_000_000, animated: false });
    const metadata = await image.metadata();
    if (!["webp", "jpeg", "png"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("format");
    // Decode/encode rejects corrupt files and removes EXIF/GPS and other source metadata.
    const cleaned = await image.rotate().resize(1000, 1000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    if (cleaned.length > MAX_PHOTO_BYTES) throw new Error("size");
    return cleaned;
  } catch { throw new CrmError("Foto tidak valid atau terlalu besar setelah diproses. Ganti foto dan coba lagi."); }
}
