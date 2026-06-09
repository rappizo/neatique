import { Buffer } from "node:buffer";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

type Manifest = Record<string, string>;

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg"]);
const MANIFEST_PATH = path.join(process.cwd(), "data", "vercel-blob-media-manifest.generated.ts");

function getFlag(name: string) {
  return process.argv.includes(name);
}

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] ||= value;
  }
}

function encodeMediaSegment(value: string) {
  return encodeURIComponent(value);
}

function normalizeRoutePath(value: string) {
  return value.replace(/\\/g, "/");
}

function getContentType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  if (extension === ".avif") {
    return "image/avif";
  }

  if (extension === ".gif") {
    return "image/gif";
  }

  if (extension === ".svg") {
    return "image/svg+xml";
  }

  return "application/octet-stream";
}

function sanitizeBlobPathSegment(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || "asset"
  );
}

function sanitizeBlobFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, extension);
  return `${sanitizeBlobPathSegment(base)}${extension || ".bin"}`;
}

function buildBlobPath(input: { kind: string; folder: string; fileName: string }) {
  return [
    "site-media",
    input.kind,
    sanitizeBlobPathSegment(input.folder),
    sanitizeBlobFileName(input.fileName)
  ].join("/");
}

function walkImages(root: string) {
  const files: string[] = [];

  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(absolutePath);
      }
    }
  }

  if (existsSync(root)) {
    walk(root);
  }

  return files;
}

function getMediaTargetForImageFile(absolutePath: string) {
  const relativePath = normalizeRoutePath(path.relative(process.cwd(), absolutePath));
  const segments = relativePath.split("/");

  if (segments[0] !== "images") {
    if (segments[0] === "public" && (segments[1] === "posts" || segments[1] === "products") && segments.length === 3) {
      const folder = segments[1];
      const fileName = segments[2];
      return {
        kind: folder,
        localUrl: `/${folder}/${encodeMediaSegment(fileName)}`,
        blobPath: buildBlobPath({ kind: folder, folder: "public", fileName })
      };
    }

    return null;
  }

  if ((segments[1] === "product image" || segments[1] === "product images") && segments.length === 4) {
    const folder = segments[2];
    const fileName = segments[3];
    return {
      kind: "product",
      localUrl: `/media/product/${encodeMediaSegment(folder)}/${encodeMediaSegment(fileName)}`,
      blobPath: buildBlobPath({ kind: "product", folder, fileName })
    };
  }

  if (segments.length === 3) {
    const folder = segments[1];
    const fileName = segments[2];
    return {
      kind: "site",
      localUrl: `/media/site/${encodeMediaSegment(folder)}/${encodeMediaSegment(fileName)}`,
      blobPath: buildBlobPath({ kind: "site", folder, fileName })
    };
  }

  return null;
}

function readExistingManifest(): Manifest {
  if (!existsSync(MANIFEST_PATH)) {
    return {};
  }

  const source = readFileSync(MANIFEST_PATH, "utf8");
  const match = source.match(/vercelBlobMediaManifest:\s*Record<string,\s*string>\s*=\s*(\{[\s\S]*?\});/);

  if (!match) {
    return {};
  }

  try {
    return JSON.parse(match[1]) as Manifest;
  } catch {
    return {};
  }
}

function writeManifest(manifest: Manifest) {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right)));
  const content = [
    `export const vercelBlobMediaManifest: Record<string, string> = ${JSON.stringify(sorted, null, 2)};`,
    "",
    "export function getVercelBlobMediaUrl(localUrl: string) {",
    "  return vercelBlobMediaManifest[localUrl] ?? null;",
    "}",
    ""
  ].join("\n");

  mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, content, "utf8");
}

function replaceMappedUrl(url: string | null | undefined, manifest: Manifest) {
  if (!url) {
    return url ?? null;
  }

  return manifest[url] ?? url;
}

function replaceMappedGallery(value: string | null, manifest: Manifest) {
  if (!value) {
    return value;
  }

  return value
    .split(/\r?\n/)
    .map((line) => replaceMappedUrl(line.trim(), manifest) || "")
    .filter(Boolean)
    .join("\n");
}

async function main() {
  loadDotEnv();

  const apply = getFlag("--apply");
  const force = getFlag("--force");
  const [{ prisma }, { putPublicBlob, getVercelBlobToken }, { storePostCoverImage }] = await Promise.all([
    import("../lib/db"),
    import("../lib/vercel-blob-storage"),
    import("../lib/post-image-storage")
  ]);
  const token = getVercelBlobToken();

  if (apply && !token) {
    throw new Error("Missing Vercel Blob token. Set BLOB_READ_WRITE_TOKEN or COMIC_READ_WRITE_TOKEN.");
  }

  const manifest = readExistingManifest();
  const imageFiles = [
    ...walkImages(path.join(process.cwd(), "images")),
    ...walkImages(path.join(process.cwd(), "public", "posts")),
    ...walkImages(path.join(process.cwd(), "public", "products"))
  ];
  const uploadTargets = imageFiles
    .map((absolutePath) => {
      const target = getMediaTargetForImageFile(absolutePath);

      if (!target) {
        return null;
      }

      const stat = statSync(absolutePath);
      return {
        absolutePath,
        size: stat.size,
        contentType: getContentType(absolutePath),
        ...target
      };
    })
    .filter((target): target is NonNullable<typeof target> => Boolean(target));
  const targetsToUpload = uploadTargets.filter((target) => force || !manifest[target.localUrl]);

  let uploadedCount = 0;
  let uploadedBytes = 0;

  if (apply) {
    for (const target of targetsToUpload) {
      const blob = await putPublicBlob({
        pathname: target.blobPath,
        body: readFileSync(target.absolutePath),
        contentType: target.contentType,
        token
      });

      if (!blob) {
        throw new Error(`Failed to upload ${target.absolutePath}`);
      }

      manifest[target.localUrl] = blob.url;
      uploadedCount += 1;
      uploadedBytes += target.size;
      console.log(`Uploaded ${uploadedCount}/${targetsToUpload.length}: ${target.localUrl}`);
    }

    writeManifest(manifest);
  }

  const [products, mascots, posts] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        imageUrl: true,
        galleryImages: true
      }
    }),
    prisma.mascotReward.findMany({
      select: {
        id: true,
        imageUrl: true
      }
    }),
    prisma.post.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        coverImageUrl: true,
        coverImageData: true,
        coverImageMimeType: true
      }
    })
  ]);

  let productUpdates = 0;
  let mascotUpdates = 0;
  let postUrlUpdates = 0;
  let postCoverUploads = 0;

  if (apply) {
    for (const product of products) {
      const nextImageUrl = replaceMappedUrl(product.imageUrl, manifest);
      const nextGalleryImages = replaceMappedGallery(product.galleryImages, manifest);

      if (nextImageUrl !== product.imageUrl || nextGalleryImages !== product.galleryImages) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: nextImageUrl || product.imageUrl,
            galleryImages: nextGalleryImages
          }
        });
        productUpdates += 1;
      }
    }

    for (const mascot of mascots) {
      const nextImageUrl = replaceMappedUrl(mascot.imageUrl, manifest);

      if (nextImageUrl && nextImageUrl !== mascot.imageUrl) {
        await prisma.mascotReward.update({
          where: { id: mascot.id },
          data: { imageUrl: nextImageUrl }
        });
        mascotUpdates += 1;
      }
    }

    for (const post of posts) {
      if (post.coverImageData) {
        const storedCoverImage = await storePostCoverImage({
          postId: post.id,
          slug: post.slug,
          title: post.title,
          base64Data: post.coverImageData,
          mimeType: post.coverImageMimeType || "image/png"
        });

        await prisma.post.update({
          where: { id: post.id },
          data: {
            coverImageUrl: storedCoverImage.coverImageUrl,
            coverImageData: storedCoverImage.coverImageData,
            coverImageMimeType: storedCoverImage.coverImageMimeType
          }
        });
        postCoverUploads += 1;
        continue;
      }

      const nextCoverImageUrl = replaceMappedUrl(post.coverImageUrl, manifest);

      if (nextCoverImageUrl && nextCoverImageUrl !== post.coverImageUrl) {
        await prisma.post.update({
          where: { id: post.id },
          data: { coverImageUrl: nextCoverImageUrl }
        });
        postUrlUpdates += 1;
      }
    }
  }

  const totalUploadBytes = targetsToUpload.reduce((sum, target) => sum + target.size, 0);

  console.log(
    JSON.stringify(
      {
        apply,
        imageTargets: uploadTargets.length,
        queuedUploads: targetsToUpload.length,
        queuedUploadMB: +(totalUploadBytes / 1024 / 1024).toFixed(2),
        uploadedCount,
        uploadedMB: +(uploadedBytes / 1024 / 1024).toFixed(2),
        productUpdates,
        mascotUpdates,
        postUrlUpdates,
        postCoverUploads,
        manifestEntries: Object.keys(manifest).length
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
