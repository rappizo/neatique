import { Buffer } from "node:buffer";
import { prisma } from "@/lib/db";

export type ComicDownloadLanguage = "en" | "zh";

const COMIC_REQUIRED_PAGES_PER_EPISODE = 10;
const COMIC_PAGE_ASSET_TYPES = ["PAGE", "GENERATED_PAGE", "UPLOADED_PAGE"];
const COMIC_CHINESE_PAGE_ASSET_TYPE = "CHINESE_PAGE";

type ComicDownloadAsset = {
  id: string;
  assetType: string;
  title: string;
  imageData: string | null;
  imageMimeType: string | null;
  sortOrder: number;
  createdAt: Date;
};

type ZipFile = {
  name: string;
  data: Buffer;
  date: Date;
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function getCrc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosTimestamp(date: Date) {
  const year = Math.max(1980, date.getFullYear());

  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function buildStoredZip(files: ZipFile[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBuffer = Buffer.from(file.name, "utf8");
    const crc32 = getCrc32(file.data);
    const timestamp = getDosTimestamp(file.date);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(timestamp.time, 10);
    localHeader.writeUInt16LE(timestamp.date, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(file.data.length, 18);
    localHeader.writeUInt32LE(file.data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, file.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(timestamp.time, 12);
    centralHeader.writeUInt16LE(timestamp.date, 14);
    centralHeader.writeUInt32LE(crc32, 16);
    centralHeader.writeUInt32LE(file.data.length, 20);
    centralHeader.writeUInt32LE(file.data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + file.data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);

  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function isComicDownloadLanguage(value: string | null): value is ComicDownloadLanguage {
  return value === "en" || value === "zh";
}

function isRequiredPageNumber(pageNumber: number) {
  return pageNumber >= 1 && pageNumber <= COMIC_REQUIRED_PAGES_PER_EPISODE;
}

function isLanguageAsset(asset: ComicDownloadAsset, language: ComicDownloadLanguage) {
  return language === "zh"
    ? asset.assetType === COMIC_CHINESE_PAGE_ASSET_TYPE
    : COMIC_PAGE_ASSET_TYPES.includes(asset.assetType);
}

function getImageExtension(mimeType: string | null) {
  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) {
    return "jpg";
  }

  if (mimeType?.includes("webp")) {
    return "webp";
  }

  if (mimeType?.includes("avif")) {
    return "avif";
  }

  return "png";
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/["<>|:*?\\/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function getCompletedLanguageAssets(
  assets: ComicDownloadAsset[],
  language: ComicDownloadLanguage
) {
  const byPage = new Map<number, ComicDownloadAsset>();

  assets
    .filter((asset) => isLanguageAsset(asset, language) && isRequiredPageNumber(asset.sortOrder))
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    })
    .forEach((asset) => {
      if (!byPage.has(asset.sortOrder)) {
        byPage.set(asset.sortOrder, asset);
      }
    });

  return Array.from({ length: COMIC_REQUIRED_PAGES_PER_EPISODE }, (_, index) =>
    byPage.get(index + 1)
  );
}

export function parseComicDownloadLanguage(value: string | null): ComicDownloadLanguage {
  return isComicDownloadLanguage(value) ? value : "en";
}

export async function createComicEpisodeDownloadZip({
  episodeId,
  language,
  requirePublished
}: {
  episodeId: string;
  language: ComicDownloadLanguage;
  requirePublished: boolean;
}) {
  const episode = await prisma.comicEpisode.findUnique({
    where: { id: episodeId },
    select: {
      episodeNumber: true,
      title: true,
      published: true,
      assets: {
        where: {
          published: true,
          sortOrder: { gte: 1, lte: COMIC_REQUIRED_PAGES_PER_EPISODE }
        },
        select: {
          id: true,
          assetType: true,
          title: true,
          imageData: true,
          imageMimeType: true,
          sortOrder: true,
          createdAt: true
        }
      },
      chapter: {
        select: {
          published: true,
          season: {
            select: {
              published: true
            }
          }
        }
      }
    }
  });

  if (!episode) {
    return {
      ok: false as const,
      status: 404,
      error: "Comic episode not found."
    };
  }

  if (
    requirePublished &&
    (!episode.published || !episode.chapter.published || !episode.chapter.season.published)
  ) {
    return {
      ok: false as const,
      status: 404,
      error: "Comic episode is not public."
    };
  }

  const assets = getCompletedLanguageAssets(episode.assets, language);
  const hasAllPages = assets.every((asset) => asset?.imageData);

  if (!hasAllPages) {
    return {
      ok: false as const,
      status: 409,
      error: "This language version needs all 10 approved pages before download."
    };
  }

  const languageLabel = language === "zh" ? "chinese" : "english";
  const episodeNumber = String(episode.episodeNumber).padStart(3, "0");
  const zipBaseName = sanitizeFileName(`${episodeNumber}-${episode.title}-${languageLabel}`);
  const files = assets.map((asset, index) => {
    const pageNumber = String(index + 1).padStart(2, "0");

    return {
      name: `${zipBaseName}/page-${pageNumber}.${getImageExtension(asset?.imageMimeType || null)}`,
      data: Buffer.from(asset?.imageData || "", "base64"),
      date: asset?.createdAt || new Date()
    };
  });

  return {
    ok: true as const,
    fileName: `${zipBaseName}.zip`,
    zip: buildStoredZip(files)
  };
}
