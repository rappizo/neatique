import { getVercelBlobMediaUrl } from "@/data/vercel-blob-media-manifest.generated";

export function buildSiteImageUrl(folder: string, fileName: string) {
  const localUrl = `/media/site/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`;
  return getVercelBlobMediaUrl(localUrl) ?? localUrl;
}
