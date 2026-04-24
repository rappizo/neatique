import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

async function main() {
  const [{ prisma }, { syncComicWorkspaceToDatabase }] = await Promise.all([
    import("../lib/db"),
    import("../lib/comic-workspace-sync")
  ]);
  const summary = await syncComicWorkspaceToDatabase();

  console.log("Comic workspace synced.");
  console.log(
    JSON.stringify(
      {
        projectTitle: summary.projectTitle,
        characterCount: summary.characterCount,
        sceneCount: summary.sceneCount,
        seasonCount: summary.seasonCount,
        chapterCount: summary.chapterCount,
        episodeCount: summary.episodeCount
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Comic workspace sync failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../lib/db");
    await prisma.$disconnect();
  });
