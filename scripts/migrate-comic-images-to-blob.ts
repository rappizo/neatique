import { prisma } from "@/lib/db";
import { storeComicImage } from "@/lib/comic-image-storage";

function getNumberArg(name: string, fallback: number) {
  const prefix = `${name}=`;
  const rawValue = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const parsed = Number.parseInt(rawValue || "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getFlag(name: string) {
  return process.argv.includes(name);
}

function buildMigrationFileName(asset: { id: string; title: string; sortOrder: number }) {
  const pageLabel = asset.sortOrder > 0 ? `page-${String(asset.sortOrder).padStart(2, "0")}` : "asset";
  return `${pageLabel}-${asset.id}-${asset.title}`;
}

async function main() {
  const apply = getFlag("--apply");
  const keepData = getFlag("--keep-data");
  const limit = getNumberArg("--limit", 50);
  const assets = await prisma.comicEpisodeAsset.findMany({
    where: {
      imageData: {
        not: null
      }
    },
    orderBy: [{ createdAt: "asc" }],
    take: limit,
    select: {
      id: true,
      episodeId: true,
      title: true,
      sortOrder: true,
      imageData: true,
      imageMimeType: true
    }
  });

  if (!apply) {
    console.log(
      `Dry run: ${assets.length} comic image assets are ready to migrate. Run with --apply to upload.`
    );
    return;
  }

  let migratedCount = 0;

  for (const asset of assets) {
    if (!asset.imageData) {
      continue;
    }

    const storedImage = await storeComicImage({
      base64Data: asset.imageData,
      mimeType: asset.imageMimeType || "image/png",
      category: "migrated-pages",
      targetId: asset.episodeId,
      fileName: buildMigrationFileName(asset)
    });

    if (storedImage.imageData) {
      throw new Error(
        "Vercel Blob token is missing. Set comic_READ_WRITE_TOKEN before running the migration."
      );
    }

    await prisma.comicEpisodeAsset.update({
      where: { id: asset.id },
      data: {
        imageUrl: storedImage.imageUrl,
        imageData: keepData ? asset.imageData : null,
        imageMimeType: storedImage.imageMimeType,
        imageStorageKey: storedImage.imageStorageKey,
        imageByteSize: storedImage.imageByteSize,
        imageSha256: storedImage.imageSha256
      }
    });

    migratedCount += 1;
    console.log(`Migrated ${migratedCount}/${assets.length}: ${asset.title}`);
  }

  console.log(
    keepData
      ? `Done: migrated ${migratedCount} assets and kept DB imageData.`
      : `Done: migrated ${migratedCount} assets and cleared DB imageData.`
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
