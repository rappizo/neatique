import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const PRODUCT_MEDIA_FOLDERS: Record<string, string> = {
  "pdrn-cream": "HH075 PDRN Cream",
  "pdrn-serum": "HH079 PDRN Serum",
  "snail-mucin-cream": "HH069 SC93 Snail Mucin Cream",
  "snail-mucin-serum": "HH068 SE96 Snail Mucin Serum"
};

export function getProductImageRoot() {
  const singular = path.join(process.cwd(), "images", "product image");
  const plural = path.join(process.cwd(), "images", "product images");
  return existsSync(singular) ? singular : plural;
}

export function buildProductMediaUrl(folder: string, fileName: string) {
  return `/media/product/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`;
}

export function getProductMediaFolder(slug: string) {
  return PRODUCT_MEDIA_FOLDERS[slug] ?? null;
}

function sortProductMediaFileNames(fileNames: string[]) {
  return [...fileNames].sort((left, right) => {
    const leftNumber = Number.parseInt(left.replace(/\D/g, ""), 10);
    const rightNumber = Number.parseInt(right.replace(/\D/g, ""), 10);

    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  });
}

export function getLocalProductGallery(slug: string) {
  const folder = getProductMediaFolder(slug);

  if (!folder) {
    return [];
  }

  const directory = path.join(getProductImageRoot(), folder);

  if (!existsSync(directory)) {
    return [];
  }

  const fileNames = readdirSync(directory).filter((fileName) => /\.(png|jpe?g|webp|avif)$/i.test(fileName));

  return sortProductMediaFileNames(fileNames).map((fileName) => buildProductMediaUrl(folder, fileName));
}

export function getDefaultProductImageUrl(slug: string) {
  return getLocalProductGallery(slug)[0] ?? null;
}
