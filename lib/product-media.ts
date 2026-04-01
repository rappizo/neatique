import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const PRODUCT_MEDIA_FOLDERS: Record<string, string> = {
  "nt16-niacinamide-tranexamic-serum": "HH067 NT16 11% Niacinamide + 5% Tranexamic Serum",
  "tnv3-tranexamic-nicotinamide-serum": "HH060 TNV3 10% Tranexamic Acid + 2% Nicotinamide Secrum",
  "at13-arbutin-tranexamic-cream": "HH061 AT13 8% Arbutin + 5% Tranexamic Cream",
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

function getProductMediaDirectoryAndFiles(slug: string, options?: { supportedReferenceOnly?: boolean }) {
  const folder = getProductMediaFolder(slug);

  if (!folder) {
    return null;
  }

  const directory = path.join(getProductImageRoot(), folder);

  if (!existsSync(directory)) {
    return null;
  }

  const fileNames = readdirSync(directory).filter((fileName) => {
    if (options?.supportedReferenceOnly) {
      return /\.(png|jpe?g|webp)$/i.test(fileName);
    }

    return /\.(png|jpe?g|webp|avif)$/i.test(fileName);
  });

  return {
    folder,
    directory,
    fileNames: sortProductMediaFileNames(fileNames)
  };
}

function getMimeTypeForFileName(fileName: string) {
  if (/\.png$/i.test(fileName)) {
    return "image/png";
  }

  if (/\.webp$/i.test(fileName)) {
    return "image/webp";
  }

  return "image/jpeg";
}

export function getLocalProductGallery(slug: string) {
  const media = getProductMediaDirectoryAndFiles(slug);

  if (!media) {
    return [];
  }

  return media.fileNames.map((fileName) => buildProductMediaUrl(media.folder, fileName));
}

export function getDefaultProductImageUrl(slug: string) {
  return getLocalProductGallery(slug)[0] ?? null;
}

export function getDefaultProductImageReferenceAsset(slug: string) {
  const media = getProductMediaDirectoryAndFiles(slug, { supportedReferenceOnly: true });

  if (!media || media.fileNames.length === 0) {
    return null;
  }

  const fileName = media.fileNames[0];
  const absolutePath = path.join(media.directory, fileName);

  return {
    fileName,
    mimeType: getMimeTypeForFileName(fileName),
    data: readFileSync(absolutePath)
  };
}
