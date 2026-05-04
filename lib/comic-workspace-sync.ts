import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import {
  ensureComicWorkspaceScaffold,
  getComicRootPath,
  listComicChapterSceneReferences,
  listComicReferenceFiles
} from "@/lib/comic-workspace";
import {
  getComicCharacterReferenceFolder,
  getComicChapterSceneReferenceFolder,
  getComicSceneReferenceFolder
} from "@/lib/comic-paths";
import {
  formatComicBilingualSummary,
  parseComicBilingualText
} from "@/lib/comic-bilingual-outline";
import { selectComicWorkspaceTextForSync } from "@/lib/comic-workspace-sync-preserve";
import { slugify } from "@/lib/utils";
import type { ComicChapterSceneReferenceRecord } from "@/lib/types";

export type ComicWorkspaceSyncSummary = {
  projectTitle: string;
  characterCount: number;
  sceneCount: number;
  seasonCount: number;
  chapterCount: number;
  episodeCount: number;
};

type ComicReferenceManifest = {
  generatedAt: string | null;
  characters: Record<string, ComicChapterSceneReferenceRecord[]>;
  scenes: Record<string, ComicChapterSceneReferenceRecord[]>;
  chapters: Record<
    string,
    {
      folder: string;
      references: ComicChapterSceneReferenceRecord[];
    }
  >;
};

const MANIFEST_PATH = path.join(process.cwd(), "data", "comic-reference-manifest.json");
const MANIFEST_MODULE_PATH = path.join(
  process.cwd(),
  "data",
  "comic-reference-manifest.generated.ts"
);

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfExists(targetPath: string) {
  if (!(await pathExists(targetPath))) {
    return "";
  }

  return normalizeText(await readFile(targetPath, "utf8"));
}

function extractHeading(markdown: string) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || "";
}

function extractSection(markdown: string, heading: string) {
  const lines = markdown.split("\n");
  const target = heading.trim().toLowerCase();
  let collecting = false;
  const bucket: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);

    if (headingMatch) {
      const currentHeading = headingMatch[2].trim().toLowerCase();

      if (collecting) {
        break;
      }

      if (currentHeading === target) {
        collecting = true;
        continue;
      }
    }

    if (collecting) {
      bucket.push(line);
    }
  }

  return normalizeText(bucket.join("\n"));
}

function extractFirstParagraph(section: string) {
  const paragraphs = normalizeText(section)
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  return paragraphs[0] || "";
}

function extractFirstParagraphFromSections(markdown: string, headings: string[]) {
  for (const heading of headings) {
    const paragraph = extractFirstParagraph(extractSection(markdown, heading));

    if (paragraph) {
      return paragraph;
    }
  }

  return "";
}

function extractSummaryFromBilingualOutline(
  markdown: string,
  input: {
    zhHeadings: string[];
    enHeadings: string[];
    legacyHeadings: string[];
    fallback: string;
  }
) {
  const parsed = parseComicBilingualText(markdown);

  if (parsed.zh || parsed.en) {
    const zh =
      extractFirstParagraphFromSections(parsed.zh, input.zhHeadings) ||
      extractFirstParagraph(parsed.zh);
    const en =
      extractFirstParagraphFromSections(parsed.en, input.enHeadings) ||
      extractFirstParagraph(parsed.en);

    if (zh || en) {
      return formatComicBilingualSummary({ zh, en });
    }
  }

  return extractFirstParagraphFromSections(markdown, input.legacyHeadings) || input.fallback;
}

function extractBulletList(section: string) {
  return normalizeText(section)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim());
}

function parseCharacterSortOrder(characterCastMarkdown: string) {
  const order = new Map<string, number>();
  const matches = characterCastMarkdown.matchAll(/^###\s+(.+)$/gm);
  let index = 0;

  for (const match of matches) {
    const name = match[1]?.trim();
    if (!name) {
      continue;
    }

    order.set(slugify(name), index);
    index += 1;
  }

  return order;
}

function parseSceneReadmeDescriptions(readme: string) {
  const descriptions = new Map<string, string>();
  const lines = readme.split("\n");
  let currentFile: string | null = null;
  let currentDescription: string[] = [];

  const flush = () => {
    if (currentFile) {
      descriptions.set(currentFile, normalizeText(currentDescription.join(" ")));
    }
    currentFile = null;
    currentDescription = [];
  };

  for (const line of lines) {
    const fileMatch = line.match(/^- `(.+?)`$/);

    if (fileMatch) {
      flush();
      currentFile = fileMatch[1].trim();
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (/^##\s+/.test(line)) {
      flush();
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    currentDescription.push(trimmed);
  }

  flush();
  return descriptions;
}

function parseSeasonNumberFromSlug(slug: string) {
  const match = slug.match(/^season-(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 1;
}

function parseChapterNumberFromSlug(slug: string) {
  const match = slug.match(/^chapter-(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 1;
}

function parseEpisodeNumberFromSlug(slug: string) {
  const match = slug.match(/^episode-(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 1;
}

function normalizeEpisodeTitle(heading: string, episodeNumber: number) {
  return (
    heading.replace(new RegExp(`^Episode\\s+${episodeNumber}\\s*[-:]\\s*`, "i"), "").trim() ||
    heading
  );
}

function buildChapterSceneSlug(seasonSlug: string, chapterSlug: string, sceneLabel: string) {
  return slugify(`${seasonSlug}-${chapterSlug}-${sceneLabel}`);
}

async function writeComicReferenceManifest(manifest: ComicReferenceManifest) {
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(MANIFEST_MODULE_PATH, toManifestModule(manifest), "utf8");
}

function toManifestModule(manifest: ComicReferenceManifest) {
  return [
    "import type { ComicChapterSceneReferenceRecord } from \"@/lib/types\";",
    "",
    "type ComicReferenceManifest = {",
    "  generatedAt: string | null;",
    "  characters: Record<string, ComicChapterSceneReferenceRecord[]>;",
    "  scenes: Record<string, ComicChapterSceneReferenceRecord[]>;",
    "  chapters: Record<string, { folder: string; references: ComicChapterSceneReferenceRecord[]; }>;",
    "};",
    "",
    `const comicReferenceManifest = ${JSON.stringify(manifest, null, 2)} satisfies ComicReferenceManifest;`,
    "",
    "export default comicReferenceManifest;",
    ""
  ].join("\n");
}

export async function syncComicWorkspaceToDatabase(): Promise<ComicWorkspaceSyncSummary> {
  await ensureComicWorkspaceScaffold();

  const comicRoot = getComicRootPath();
  const storyBibleRoot = path.join(comicRoot, "story-bible");
  const charactersRoot = path.join(comicRoot, "characters");
  const seasonsRoot = path.join(comicRoot, "seasons");

  const [
    seriesOverview,
    worldRules,
    visualStyleGuide,
    sourceMaterialIndex,
    characterCast
  ] = await Promise.all([
    readTextIfExists(path.join(storyBibleRoot, "series-overview.md")),
    readTextIfExists(path.join(storyBibleRoot, "world-rules.md")),
    readTextIfExists(path.join(storyBibleRoot, "visual-style-guide.md")),
    readTextIfExists(path.join(storyBibleRoot, "source-material-index.md")),
    readTextIfExists(path.join(storyBibleRoot, "character-cast.md"))
  ]);

  const projectTitle = extractHeading(seriesOverview) || "Neatique Comic Universe";
  const shortDescription =
    extractFirstParagraph(extractSection(seriesOverview, "Core premise")) ||
    "A multi-season comic project built around stable characters, scene packs, and prompt-ready story production.";
  const existingProject = await prisma.comicProject.findUnique({
    where: { slug: "main" },
    select: {
      shortDescription: true,
      storyOutline: true
    }
  });

  const project = await prisma.comicProject.upsert({
    where: { slug: "main" },
    create: {
      slug: "main",
      title: projectTitle,
      shortDescription,
      storyOutline: seriesOverview || "Add the full multi-season story outline here.",
      worldRules: worldRules || "Add the rules, logic, and canon constraints for the comic world here.",
      visualStyleGuide:
        visualStyleGuide || "Define the line quality, panel rhythm, and continuity rules here.",
      workflowNotes: sourceMaterialIndex || null
    },
    update: {
      title: projectTitle,
      shortDescription: selectComicWorkspaceTextForSync({
        existingText: existingProject?.shortDescription,
        workspaceText: shortDescription,
        fallbackText:
          "A multi-season comic project built around stable characters, scene packs, and prompt-ready story production."
      }),
      storyOutline: selectComicWorkspaceTextForSync({
        existingText: existingProject?.storyOutline,
        workspaceText: seriesOverview,
        fallbackText: "Add the full multi-season story outline here."
      }),
      worldRules: worldRules || "Add the rules, logic, and canon constraints for the comic world here.",
      visualStyleGuide:
        visualStyleGuide || "Define the line quality, panel rhythm, and continuity rules here.",
      workflowNotes: sourceMaterialIndex || null
    }
  });

  const characterSortOrder = parseCharacterSortOrder(characterCast);
  const characterEntries = (await readdir(charactersRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));

  let characterCount = 0;
  for (const [defaultIndex, entry] of characterEntries.entries()) {
    const slug = entry.name;
    const characterRoot = path.join(charactersRoot, slug);
    const profile = await readTextIfExists(path.join(characterRoot, "profile.md"));
    const name = extractHeading(profile) || slug.replace(/-/g, " ");
    const role = extractFirstParagraph(extractSection(profile, "Role")) || "Main cast";
    const appearance =
      extractSection(profile, "Appearance lock") || "Add the fixed visual appearance here.";
    const personality =
      extractSection(profile, "Personality lock") || "Add the stable personality profile here.";
    const speechGuide =
      extractSection(profile, "Voice guide") || "Add the dialogue rhythm and voice guide here.";
    const referenceNotes = extractSection(profile, "Non-negotiable visual references") || null;
    const sortOrder = characterSortOrder.get(slug) ?? defaultIndex;

    await prisma.comicCharacter.upsert({
      where: { slug },
      create: {
        projectId: project.id,
        name,
        slug,
        role,
        appearance,
        personality,
        speechGuide,
        referenceFolder: getComicCharacterReferenceFolder(slug),
        referenceNotes,
        active: true,
        sortOrder
      },
      update: {
        projectId: project.id,
        name,
        role,
        appearance,
        personality,
        speechGuide,
        referenceFolder: getComicCharacterReferenceFolder(slug),
        referenceNotes,
        active: true,
        sortOrder
      }
    });

    characterCount += 1;
  }

  const seasonEntries = (await readdir(seasonsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("season-"))
    .sort((left, right) => left.name.localeCompare(right.name));

  let seasonCount = 0;
  let chapterCount = 0;
  let episodeCount = 0;
  const importedSceneSlugs = new Set<string>();
  const importedSceneReferenceRecords = new Map<string, ComicChapterSceneReferenceRecord[]>();
  const manifest: ComicReferenceManifest = {
    generatedAt: new Date().toISOString(),
    characters: {},
    scenes: {},
    chapters: {}
  };

  for (const seasonEntry of seasonEntries) {
    const seasonSlug = seasonEntry.name;
    const seasonRoot = path.join(seasonsRoot, seasonSlug);
    const seasonOutline = await readTextIfExists(path.join(seasonRoot, "season-outline.md"));
    const seasonNumber = parseSeasonNumberFromSlug(seasonSlug);
    const seasonTitle = extractHeading(seasonOutline) || `Season ${seasonNumber}`;
    const seasonSummary = extractSummaryFromBilingualOutline(seasonOutline, {
      zhHeadings: ["Season 目标", "季目标", "本季目标"],
      enHeadings: ["Season Objective", "Season objective"],
      legacyHeadings: ["Season objective"],
      fallback: "Add the season summary here."
    });
    const existingSeason = await prisma.comicSeason.findUnique({
      where: {
        projectId_slug: {
          projectId: project.id,
          slug: seasonSlug
        }
      },
      select: {
        summary: true,
        outline: true
      }
    });

    const season = await prisma.comicSeason.upsert({
      where: {
        projectId_slug: {
          projectId: project.id,
          slug: seasonSlug
        }
      },
      create: {
        projectId: project.id,
        seasonNumber,
        slug: seasonSlug,
        title: seasonTitle,
        summary: seasonSummary,
        outline: seasonOutline || "Add the season outline here.",
        published: false,
        sortOrder: seasonNumber
      },
      update: {
        seasonNumber,
        title: seasonTitle,
        summary: selectComicWorkspaceTextForSync({
          existingText: existingSeason?.summary,
          workspaceText: seasonSummary,
          fallbackText: "Add the season summary here."
        }),
        outline: selectComicWorkspaceTextForSync({
          existingText: existingSeason?.outline,
          workspaceText: seasonOutline,
          fallbackText: "Add the season outline here."
        }),
        sortOrder: seasonNumber
      }
    });
    seasonCount += 1;

    const chapterEntries = (await readdir(seasonRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("chapter-"))
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const chapterEntry of chapterEntries) {
      const chapterSlug = chapterEntry.name;
      const chapterRoot = path.join(seasonRoot, chapterSlug);
      const chapterOutline = await readTextIfExists(path.join(chapterRoot, "chapter-outline.md"));
      const chapterNumber = parseChapterNumberFromSlug(chapterSlug);
      const chapterTitle = extractHeading(chapterOutline) || `Chapter ${chapterNumber}`;
      const chapterSummary = extractSummaryFromBilingualOutline(chapterOutline, {
        zhHeadings: ["Chapter 目标", "章节目标", "本章目标"],
        enHeadings: ["Chapter Objective", "Chapter objective"],
        legacyHeadings: ["Chapter objective"],
        fallback: "Add the chapter summary here."
      });
      const existingChapter = await prisma.comicChapter.findUnique({
        where: {
          seasonId_slug: {
            seasonId: season.id,
            slug: chapterSlug
          }
        },
        select: {
          summary: true,
          outline: true
        }
      });

      const chapter = await prisma.comicChapter.upsert({
        where: {
          seasonId_slug: {
            seasonId: season.id,
            slug: chapterSlug
          }
        },
        create: {
          seasonId: season.id,
          chapterNumber,
          slug: chapterSlug,
          title: chapterTitle,
          summary: chapterSummary,
          outline: chapterOutline || "Add the chapter outline here.",
          published: false,
          sortOrder: chapterNumber
        },
        update: {
          chapterNumber,
          title: chapterTitle,
          summary: selectComicWorkspaceTextForSync({
            existingText: existingChapter?.summary,
            workspaceText: chapterSummary,
            fallbackText: "Add the chapter summary here."
          }),
          outline: selectComicWorkspaceTextForSync({
            existingText: existingChapter?.outline,
            workspaceText: chapterOutline,
            fallbackText: "Add the chapter outline here."
          }),
          sortOrder: chapterNumber
        }
      });
      chapterCount += 1;

      const sceneRefFolder = path.join(chapterRoot, "scene-refs");
      const sceneRefReadme = await readTextIfExists(path.join(sceneRefFolder, "README.md"));
      const sceneDescriptions = parseSceneReadmeDescriptions(sceneRefReadme);
      const sceneRefs = await listComicChapterSceneReferences(seasonSlug, chapterSlug);
      manifest.chapters[`${seasonSlug}/${chapterSlug}`] = {
        folder: getComicChapterSceneReferenceFolder(seasonSlug, chapterSlug),
        references: sceneRefs
      };

      for (const [sceneIndex, sceneRef] of sceneRefs.entries()) {
        const sceneSlug = buildChapterSceneSlug(seasonSlug, chapterSlug, sceneRef.label);
        if (!sceneSlug) {
          continue;
        }

        await prisma.comicScene.upsert({
          where: { slug: sceneSlug },
          create: {
            projectId: project.id,
            name: sceneRef.label,
            slug: sceneSlug,
            summary:
              sceneDescriptions.get(sceneRef.fileName) ||
              `Chapter scene reference imported from ${chapterTitle}.`,
            visualNotes:
              `Use the locked line-art environment sheet ${sceneRef.fileName} as the layout anchor. Preserve architecture, staging, and camera logic.`,
            moodNotes:
              `Lighting can change by panel, but the base space from ${sceneRef.fileName} should remain stable and readable.`,
            referenceFolder: getComicChapterSceneReferenceFolder(seasonSlug, chapterSlug),
            referenceNotes:
              `Primary file: ${sceneRef.fileName}. Imported from ${seasonTitle} / ${chapterTitle}.`,
            active: true,
            sortOrder: sceneIndex
          },
          update: {
            projectId: project.id,
            name: sceneRef.label,
            summary:
              sceneDescriptions.get(sceneRef.fileName) ||
              `Chapter scene reference imported from ${chapterTitle}.`,
            visualNotes:
              `Use the locked line-art environment sheet ${sceneRef.fileName} as the layout anchor. Preserve architecture, staging, and camera logic.`,
            moodNotes:
              `Lighting can change by panel, but the base space from ${sceneRef.fileName} should remain stable and readable.`,
            referenceFolder: getComicChapterSceneReferenceFolder(seasonSlug, chapterSlug),
            referenceNotes:
              `Primary file: ${sceneRef.fileName}. Imported from ${seasonTitle} / ${chapterTitle}.`,
            active: true,
            sortOrder: sceneIndex
          }
        });

        importedSceneSlugs.add(sceneSlug);
        importedSceneReferenceRecords.set(sceneSlug, [sceneRef]);
      }

      const episodeEntries = (await readdir(chapterRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("episode-"))
        .sort((left, right) => left.name.localeCompare(right.name));

      for (const episodeEntry of episodeEntries) {
        const episodeSlug = episodeEntry.name;
        const episodeRoot = path.join(chapterRoot, episodeSlug);
        const episodeOutline = await readTextIfExists(path.join(episodeRoot, "episode-outline.md"));
        const episodeNumber = parseEpisodeNumberFromSlug(episodeSlug);
        const episodeHeading = extractHeading(episodeOutline) || `Episode ${episodeNumber}`;
        const episodeTitle = normalizeEpisodeTitle(episodeHeading, episodeNumber);
        const episodeSummary = extractSummaryFromBilingualOutline(episodeOutline, {
          zhHeadings: ["Episode 承诺", "本话承诺", "核心剧情"],
          enHeadings: ["Episode Promise", "Episode promise", "Core Plot", "Core plot"],
          legacyHeadings: ["Episode promise", "Core plot"],
          fallback: "Add the episode promise here."
        });
        const existingEpisode = await prisma.comicEpisode.findUnique({
          where: {
            chapterId_slug: {
              chapterId: chapter.id,
              slug: episodeSlug
            }
          },
          select: {
            summary: true,
            outline: true
          }
        });

        await prisma.comicEpisode.upsert({
          where: {
            chapterId_slug: {
              chapterId: chapter.id,
              slug: episodeSlug
            }
          },
          create: {
            chapterId: chapter.id,
            episodeNumber,
            slug: episodeSlug,
            title: episodeTitle,
            summary: episodeSummary,
            outline: episodeOutline || "Add the episode outline here.",
            script: "",
            panelPlan: "",
            promptPack: "",
            requiredReferences: "",
            published: false,
            sortOrder: episodeNumber
          },
          update: {
            episodeNumber,
            title: episodeTitle,
            summary: selectComicWorkspaceTextForSync({
              existingText: existingEpisode?.summary,
              workspaceText: episodeSummary,
              fallbackText: "Add the episode promise here."
            }),
            outline: selectComicWorkspaceTextForSync({
              existingText: existingEpisode?.outline,
              workspaceText: episodeOutline,
              fallbackText: "Add the episode outline here."
            }),
            sortOrder: episodeNumber
          }
        });

        episodeCount += 1;
      }
    }
  }

  const [manifestCharacters, manifestScenes] = await Promise.all([
    prisma.comicCharacter.findMany({
      where: { projectId: project.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    }),
    prisma.comicScene.findMany({
      where: { projectId: project.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    })
  ]);

  for (const character of manifestCharacters) {
    manifest.characters[character.slug] = await listComicReferenceFiles(character.referenceFolder);
  }

  for (const scene of manifestScenes) {
    manifest.scenes[scene.slug] =
      importedSceneReferenceRecords.get(scene.slug) ||
      (await listComicReferenceFiles(scene.referenceFolder));
  }

  const sceneWorkspaceRoot = path.join(comicRoot, "scenes");
  const sceneWorkspaceExists = await pathExists(sceneWorkspaceRoot);
  if (sceneWorkspaceExists) {
    const sceneFolders = (await readdir(sceneWorkspaceRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    for (const sceneSlug of sceneFolders) {
      if (manifest.scenes[sceneSlug]) {
        continue;
      }

      manifest.scenes[sceneSlug] = await listComicReferenceFiles(
        getComicSceneReferenceFolder(sceneSlug)
      );
    }
  }

  await writeComicReferenceManifest(manifest);

  return {
    projectTitle,
    characterCount,
    sceneCount: importedSceneSlugs.size,
    seasonCount,
    chapterCount,
    episodeCount
  };
}
