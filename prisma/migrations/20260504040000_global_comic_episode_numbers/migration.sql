WITH ordered_episodes AS (
  SELECT
    episode.id,
    ROW_NUMBER() OVER (
      ORDER BY
        season."seasonNumber" ASC,
        season."sortOrder" ASC,
        season."createdAt" ASC,
        chapter."chapterNumber" ASC,
        chapter."sortOrder" ASC,
        chapter."createdAt" ASC,
        episode."episodeNumber" ASC,
        episode."sortOrder" ASC,
        episode."createdAt" ASC
    )::integer AS next_episode_number
  FROM "ComicEpisode" episode
  INNER JOIN "ComicChapter" chapter ON chapter.id = episode."chapterId"
  INNER JOIN "ComicSeason" season ON season.id = chapter."seasonId"
)
UPDATE "ComicEpisode" episode
SET
  "episodeNumber" = ordered_episodes.next_episode_number,
  "sortOrder" = ordered_episodes.next_episode_number
FROM ordered_episodes
WHERE episode.id = ordered_episodes.id;

DROP INDEX IF EXISTS "ComicEpisode_chapterId_episodeNumber_key";

CREATE UNIQUE INDEX "ComicEpisode_episodeNumber_key" ON "ComicEpisode"("episodeNumber");
CREATE INDEX "ComicEpisode_chapterId_episodeNumber_idx" ON "ComicEpisode"("chapterId", "episodeNumber");
