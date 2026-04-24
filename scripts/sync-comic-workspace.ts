import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

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
        chapterCount: summary.chapterCount
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
