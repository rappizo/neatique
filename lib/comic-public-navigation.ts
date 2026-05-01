import { getComicLanguageHref, type ComicLanguage } from "@/lib/comic-language";
import type {
  ComicPublicEpisodeRecord,
  ComicPublicSeasonRecord
} from "@/lib/types";

export function getFlattenedComicEpisodes(seasons: ComicPublicSeasonRecord[]) {
  return seasons.flatMap((season) =>
    season.chapters.flatMap((chapter) =>
      chapter.episodes.map((episode) => ({
        ...episode,
        seasonTitle: season.title,
        seasonSlug: season.slug,
        chapterTitle: chapter.title,
        chapterSlug: chapter.slug
      }))
    )
  );
}

export function formatComicEpisodeNumber(episodeNumber: number) {
  return String(episodeNumber).padStart(3, "0");
}

export function formatComicEpisodeTitle(episode: Pick<ComicPublicEpisodeRecord, "episodeNumber" | "title">) {
  return `${formatComicEpisodeNumber(episode.episodeNumber)} - "${episode.title}"`;
}

export function getComicEpisodeHref(
  episode: Pick<ComicPublicEpisodeRecord, "seasonSlug" | "chapterSlug" | "slug">,
  language: ComicLanguage
) {
  return getComicLanguageHref(
    `/comic/${episode.seasonSlug}/${episode.chapterSlug}/${episode.slug}`,
    language
  );
}

export function getAdjacentComicEpisodes(
  episodes: ComicPublicEpisodeRecord[],
  currentEpisode: ComicPublicEpisodeRecord
) {
  const currentIndex = episodes.findIndex((episode) => episode.id === currentEpisode.id);

  return {
    previousEpisode: currentIndex > 0 ? episodes[currentIndex - 1] : null,
    nextEpisode:
      currentIndex >= 0 && currentIndex < episodes.length - 1
        ? episodes[currentIndex + 1]
        : null
  };
}
