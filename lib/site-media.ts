export function buildSiteImageUrl(folder: string, fileName: string) {
  return `/media/site/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`;
}
