/** Best-effort JPEG downscaling before upload. Originals remain the fallback.
 * PNG/WebP may be animated, so those are resized by the metadata-aware server
 * delivery path instead. GIF/video/documents are never changed here.
 */
export async function compressPostImage(file: File): Promise<File> {
  if (file.type !== "image/jpeg" || file.size < 300 * 1024 || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 40_000_000) return file;
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp", lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
