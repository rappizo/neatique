export const COMIC_COVER_PAGE_NUMBER = 0;
export const COMIC_STORY_PAGES_PER_EPISODE = 10;
export const COMIC_REQUIRED_PAGE_NUMBERS = [
  COMIC_COVER_PAGE_NUMBER,
  ...Array.from({ length: COMIC_STORY_PAGES_PER_EPISODE }, (_, index) => index + 1)
];
export const COMIC_REQUIRED_PAGE_COUNT = COMIC_REQUIRED_PAGE_NUMBERS.length;
export const COMIC_PAGE_ASSET_TYPES = ["PAGE", "GENERATED_PAGE", "UPLOADED_PAGE"];
export const COMIC_CHINESE_PAGE_ASSET_TYPE = "CHINESE_PAGE";
export const COMIC_EXTRA_PAGE_ASSET_TYPE = "EXTRA_PAGE";
export const COMIC_APPROVAL_ASSET_TYPES = [
  ...COMIC_PAGE_ASSET_TYPES,
  COMIC_CHINESE_PAGE_ASSET_TYPE
];

export function isComicCoverPageNumber(pageNumber: number) {
  return Number.isInteger(pageNumber) && pageNumber === COMIC_COVER_PAGE_NUMBER;
}

export function isComicStoryPageNumber(pageNumber: number) {
  return (
    Number.isInteger(pageNumber) &&
    pageNumber >= 1 &&
    pageNumber <= COMIC_STORY_PAGES_PER_EPISODE
  );
}

export function isComicPublishPageNumber(pageNumber: number) {
  return isComicCoverPageNumber(pageNumber) || isComicStoryPageNumber(pageNumber);
}

export function formatComicPageLabel(pageNumber: number) {
  return isComicCoverPageNumber(pageNumber)
    ? "Cover"
    : `Page ${String(pageNumber).padStart(2, "0")}`;
}

export function formatComicPageFileSlug(pageNumber: number) {
  return isComicCoverPageNumber(pageNumber)
    ? "cover"
    : `page-${String(pageNumber).padStart(2, "0")}`;
}

export function getComicRequiredPageNumbers() {
  return [...COMIC_REQUIRED_PAGE_NUMBERS];
}
