export const COMIC_ROOT_RELATIVE = "comic";

export function getComicRootFolder() {
  return COMIC_ROOT_RELATIVE;
}

export function getComicCharacterReferenceFolder(slug: string) {
  return `${COMIC_ROOT_RELATIVE}/characters/${slug}/refs`;
}

export function getComicSceneReferenceFolder(slug: string) {
  return `${COMIC_ROOT_RELATIVE}/scenes/${slug}/refs`;
}

export function getComicChapterSceneReferenceFolder(seasonSlug: string, chapterSlug: string) {
  return `${COMIC_ROOT_RELATIVE}/seasons/${seasonSlug}/${chapterSlug}/scene-refs`;
}

export function getComicChapterSceneReferenceKey(seasonSlug: string, chapterSlug: string) {
  return `${seasonSlug}/${chapterSlug}`;
}
