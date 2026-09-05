import sharp from "sharp";

export const thumbnailWidths = [480, 800, 1280] as const;

export async function makePostThumbnail(input: Buffer, width: number) {
  if (!(thumbnailWidths as readonly number[]).includes(width)) throw new Error("Invalid thumbnail width");
  if (input.byteLength > 25 * 1024 * 1024) throw new Error("Image too large");
  const jpeg = input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
  const png = input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = input.toString("ascii", 0, 4) === "RIFF" && input.toString("ascii", 8, 12) === "WEBP";
  // Reject vector/document formats before passing data to an image decoder.
  if (!jpeg && !png && !webp) throw new Error("Use original for this image format");
  const pipeline = sharp(input, { limitInputPixels: 40_000_000, failOn: "error" });
  const metadata = await pipeline.metadata();
  // Never flatten animation or process vector/external-resource formats.
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
    throw new Error("Use original for this image format");
  }
  return pipeline.rotate().resize({ width, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 3 }).timeout({ seconds: 5 }).toBuffer();
}
