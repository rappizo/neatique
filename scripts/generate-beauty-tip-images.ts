import { loadEnvConfig } from "@next/env";
import { readFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

loadEnvConfig(process.cwd());

type BeautyTipImageManifest = {
  slug: string;
  referenceImage?: string;
  outputDirectory: string;
  assets: Array<{
    id: string;
    fileName: string;
    role: "cover" | "inline";
    aspectRatio: "1:1" | "3:2" | "4:3" | "16:9" | "9:16";
    imageSize: "1K" | "2K" | "4K";
    prompt: string;
    alt: string;
    caption: string;
  }>;
};

function getArgument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function assertWorkspacePath(target: string) {
  const workspace = path.resolve(process.cwd());
  const resolved = path.resolve(target);

  if (resolved !== workspace && !resolved.startsWith(`${workspace}${path.sep}`)) {
    throw new Error(`Refusing to use a path outside the workspace: ${resolved}`);
  }

  return resolved;
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const manifestArgument = getArgument("--manifest");

  if (!manifestArgument) {
    throw new Error("Usage: npm exec tsx scripts/generate-beauty-tip-images.ts -- --manifest <file> [--force]");
  }

  const manifestPath = assertWorkspacePath(manifestArgument);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as BeautyTipImageManifest;
  const outputDirectory = assertWorkspacePath(manifest.outputDirectory);
  const force = hasFlag("--force");
  const only = getArgument("--only");

  if (!manifest.slug || !Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    throw new Error("The image manifest must include a slug and at least one asset.");
  }

  const referenceImage = manifest.referenceImage
    ? {
        mimeType: path.extname(manifest.referenceImage).toLowerCase() === ".jpg" ? "image/jpeg" : "image/png",
        data: await readFile(assertWorkspacePath(manifest.referenceImage))
      }
    : null;

  const { generateImageWithApiYi, getApiYiImageSettings } = await import("../lib/apiyi-images");
  const settings = getApiYiImageSettings();

  if (!settings.ready) {
    throw new Error("APIYI_API_KEY, APIYI_BASE_URL, and AI_IMAGE_MODEL must be configured.");
  }

  await mkdir(outputDirectory, { recursive: true });

  for (const asset of manifest.assets) {
    if (only && asset.id !== only) {
      continue;
    }

    if (!asset.fileName.endsWith(".webp")) {
      throw new Error(`Beauty Tip final images must use .webp: ${asset.fileName}`);
    }

    if (asset.alt.length < 40 || asset.alt.length > 140 || asset.caption.length < 35) {
      throw new Error(`Asset ${asset.id} does not meet the alt/caption editorial standard.`);
    }

    const outputPath = assertWorkspacePath(path.join(outputDirectory, asset.fileName));

    if (!force && await fileExists(outputPath)) {
      console.log(`Skipped existing asset: ${path.relative(process.cwd(), outputPath)}`);
      continue;
    }

    console.log(`Generating ${asset.id} with ${settings.model} through APIYI...`);
    const generated = await generateImageWithApiYi({
      prompt: asset.prompt,
      referenceImages: referenceImage ? [referenceImage] : [],
      aspectRatio: asset.aspectRatio,
      imageSize: asset.imageSize
    });
    const maxWidth = asset.role === "cover" ? 1920 : 1600;
    const finalBuffer = await sharp(generated.data)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5, smartSubsample: true })
      .toBuffer();

    await sharp(finalBuffer).toFile(outputPath);
    const metadata = await sharp(outputPath).metadata();

    console.log(JSON.stringify({
      id: asset.id,
      path: path.relative(process.cwd(), outputPath),
      width: metadata.width,
      height: metadata.height,
      bytes: finalBuffer.length,
      alt: asset.alt,
      caption: asset.caption
    }));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
