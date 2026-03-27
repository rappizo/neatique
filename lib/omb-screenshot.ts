import "server-only";
import sharp from "sharp";
import { OMB_SCREENSHOT_MAX_BYTES, OMB_SCREENSHOT_TARGET_BYTES } from "@/lib/order-match";

export async function compressOmbScreenshot(file: File) {
  if (file.size > OMB_SCREENSHOT_MAX_BYTES) {
    throw new Error("image-size");
  }

  if (!/^image\/(png|jpe?g|webp|avif)$/i.test(file.type)) {
    throw new Error("image-type");
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let transformed = sharp(inputBuffer).rotate();
  const metadata = await transformed.metadata();

  if ((metadata.width || 0) > 1600 || (metadata.height || 0) > 1600) {
    transformed = transformed.resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true
    });
  }

  for (const resizeWidth of [1600, 1280, 1080, 960, 840]) {
    const resized = transformed.clone().resize({
      width: resizeWidth,
      height: resizeWidth,
      fit: "inside",
      withoutEnlargement: true
    });

    for (const quality of [82, 76, 70, 64, 58, 52, 46, 40]) {
      const outputBuffer = await resized
        .clone()
        .webp({
          quality
        })
        .toBuffer();

      if (outputBuffer.length <= OMB_SCREENSHOT_TARGET_BYTES) {
        return {
          name: file.name.replace(/\.[^.]+$/, "") + ".webp",
          mimeType: "image/webp",
          base64: outputBuffer.toString("base64"),
          bytes: outputBuffer.length
        };
      }
    }
  }

  const fallbackBuffer = await transformed
    .clone()
    .webp({
      quality: 40
    })
    .toBuffer();

  return {
    name: file.name.replace(/\.[^.]+$/, "") + ".webp",
    mimeType: "image/webp",
    base64: fallbackBuffer.toString("base64"),
    bytes: fallbackBuffer.length
  };
}
