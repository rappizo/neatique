import { prisma } from "@/lib/db";

export async function getNextComicEpisodeNumber() {
  const aggregate = await prisma.comicEpisode.aggregate({
    _max: {
      episodeNumber: true
    }
  });

  return (aggregate._max.episodeNumber || 0) + 1;
}

export async function isComicEpisodeNumberTaken(episodeNumber: number, exceptEpisodeId?: string) {
  if (!Number.isFinite(episodeNumber) || episodeNumber <= 0) {
    return false;
  }

  const existing = await prisma.comicEpisode.findFirst({
    where: {
      episodeNumber,
      id: exceptEpisodeId
        ? {
            not: exceptEpisodeId
          }
        : undefined
    },
    select: {
      id: true
    }
  });

  return Boolean(existing);
}
