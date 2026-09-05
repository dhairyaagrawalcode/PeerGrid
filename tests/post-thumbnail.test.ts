import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { makePostThumbnail } from "../app/lib/post-thumbnail.ts";
import { compressPostImage } from "../app/lib/compress-post-image.ts";

test("private thumbnails resize to a bounded WebP without upscaling", async () => {
  const original = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#d0b0a0" } }).png().toBuffer();
  const small = await makePostThumbnail(original, 800);
  const meta = await sharp(small).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 800);
  assert.equal(meta.height, 600);
  assert.ok(small.length < original.length);
  const again = await makePostThumbnail(small, 1280);
  assert.equal((await sharp(again).metadata()).width, 800);
});

test("thumbnail transformation refuses arbitrary sizes, vectors, and corrupt data", async () => {
  await assert.rejects(makePostThumbnail(Buffer.alloc(10), 50000), /Invalid thumbnail width/);
  await assert.rejects(makePostThumbnail(Buffer.from('<svg width="20" height="20"></svg>'), 800));
  await assert.rejects(makePostThumbnail(Buffer.from("not an image"), 800));
});

test("upload compression preserves documents and potentially animated formats", async () => {
  for (const mime of ["image/png", "image/webp", "image/gif", "video/mp4", "application/pdf"]) {
    const file = new File([new Uint8Array(400_000)], "original", { type: mime });
    assert.equal(await compressPostImage(file), file);
  }
});

test("unsupported browser JPEG encoding falls back to the original", async () => {
  const file = new File([new Uint8Array(400_000)], "photo.jpg", { type: "image/jpeg" });
  assert.equal(await compressPostImage(file), file);
});
