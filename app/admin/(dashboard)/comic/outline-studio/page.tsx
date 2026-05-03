import Link from "next/link";
import {
  ComicImageTaskQueueProvider,
  ComicOutlineMultiActionForm
} from "@/components/admin/comic-image-task-queue";
import {
  hasComicChineseText,
  parseComicBilingualText
} from "@/lib/comic-bilingual-outline";
import { getComicOutlineStudioPage } from "@/lib/comic-queries";
import { getOpenAiComicSettings } from "@/lib/openai-comic";
import type {
  ComicChapterRecord,
  ComicEpisodeRecord,
  ComicProjectRecord,
  ComicSeasonRecord
} from "@/lib/types";

type AdminComicOutlineStudioPageProps = {
  searchParams: Promise<{ status?: string; scope?: string; id?: string }>;
};

type OutlineScope = "project" | "season" | "chapter" | "episode";

const STATUS_MESSAGES: Record<string, string> = {
  "project-outline-generated": "整部漫画双语大纲已更新。",
  "season-outline-generated": "Season 双语大纲已更新。",
  "chapter-outline-generated": "Chapter 双语大纲已更新。",
  "episode-outline-generated": "Episode 双语大纲已更新。",
  "project-outline-translated": "整部漫画中文版本已补齐。",
  "season-outline-translated": "Season 中文版本已补齐。",
  "chapter-outline-translated": "Chapter 中文版本已补齐。",
  "episode-outline-translated": "Episode 中文版本已补齐。",
  "season-outlines-generated": "已根据整部漫画大纲生成所有 Season 双语大纲。",
  "chapter-outlines-generated": "已根据 Season 大纲生成所有 Chapter 双语大纲。",
  "episode-outlines-generated": "已根据 Chapter 大纲生成所有 Episode 双语大纲。",
  "outline-failed": "大纲生成失败。请检查 OpenAI key、模型设置或稍后重试。",
  "outline-translation-failed": "大纲中文版本补齐失败。请检查 OpenAI key、模型设置或稍后重试。",
  "missing-parent-outline": "请先生成并确认上一级大纲，再生成下一层级。",
  "missing-outline": "当前项目还没有可处理的大纲。",
  "outline-already-chinese": "当前大纲已经有中文版本。",
  "missing-children": "当前层级下面还没有可生成的子项目。",
  "missing-record": "没有找到对应的漫画记录。"
};

const PLACEHOLDER_OUTLINES = [
  "Add the full multi-season story outline here.",
  "Add the season outline here.",
  "Add the chapter outline here.",
  "Add the episode outline here."
];

function hasUsableOutline(value?: string | null) {
  const normalized = (value || "").trim();

  return Boolean(normalized && !PLACEHOLDER_OUTLINES.includes(normalized));
}

function getOutlineStatusLabel(outline?: string | null) {
  if (!hasUsableOutline(outline)) {
    return "未生成";
  }

  const parsed = parseComicBilingualText(outline);

  if (parsed.zh && parsed.en) {
    return "双语已就绪";
  }

  if (parsed.zh) {
    return "缺英文";
  }

  if (parsed.en) {
    return "缺中文";
  }

  return hasComicChineseText(outline) ? "缺英文" : "缺中文";
}

function getOutlineStatusClass(outline?: string | null) {
  if (!hasUsableOutline(outline)) {
    return "admin-table__status-badge admin-table__status-badge--warning";
  }

  const parsed = parseComicBilingualText(outline);

  return parsed.zh && parsed.en
    ? "admin-table__status-badge admin-table__status-badge--success"
    : "admin-table__status-badge admin-table__status-badge--warning";
}

function getOutlineWordCount(outline?: string | null) {
  return (outline || "").trim().length;
}

function OutlineTextBlock({
  summary,
  outline
}: {
  summary?: string | null;
  outline?: string | null;
}) {
  const hasOutline = hasUsableOutline(outline);
  const summaryText = parseComicBilingualText(summary);
  const outlineText = hasOutline ? parseComicBilingualText(outline) : { zh: "", en: "" };

  return (
    <div className="admin-comic-outline-text">
      <div className="admin-comic-outline-bilingual">
        <section className="admin-comic-outline-language-pane">
          <div className="admin-comic-outline-language-pane__header">
            <strong>中文</strong>
          </div>
          {summaryText.zh ? (
            <div className="admin-comic-outline-summary">
              <strong>摘要</strong>
              <p>{summaryText.zh}</p>
            </div>
          ) : null}
          {outlineText.zh ? (
            <pre>{outlineText.zh}</pre>
          ) : (
            <p className="form-note">
              {hasOutline
                ? "还没有中文版本；重新生成大纲后会自动补齐。"
                : "暂无可用中文大纲。先生成上一级大纲，再生成当前层级。"}
            </p>
          )}
        </section>
        <section className="admin-comic-outline-language-pane">
          <div className="admin-comic-outline-language-pane__header">
            <strong>English</strong>
          </div>
          {summaryText.en ? (
            <div className="admin-comic-outline-summary">
              <strong>Summary</strong>
              <p>{summaryText.en}</p>
            </div>
          ) : null}
          {outlineText.en ? (
            <pre>{outlineText.en}</pre>
          ) : (
            <p className="form-note">
              {hasOutline
                ? "No English version is saved yet. Regenerate the outline to fill it in."
                : "No English outline yet. Generate the parent outline first, then generate this level."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function OutlinePanel({
  id,
  eyebrow,
  title,
  summary,
  outline,
  meta,
  children
}: {
  id: string;
  eyebrow: string;
  title: string;
  summary?: string | null;
  outline?: string | null;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="admin-form admin-comic-outline-panel">
      <div className="admin-comic-outline-panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <div className="stack-row">
            <span className={getOutlineStatusClass(outline)}>{getOutlineStatusLabel(outline)}</span>
            <span className="pill">{getOutlineWordCount(outline)} chars</span>
            {meta}
          </div>
        </div>
      </div>
      <OutlineTextBlock summary={summary} outline={outline} />
      {children}
    </section>
  );
}

function seasonLabel(season: ComicSeasonRecord) {
  return `Season ${season.seasonNumber}: ${season.title}`;
}

function chapterLabel(chapter: ComicChapterRecord) {
  return `Chapter ${chapter.chapterNumber}: ${chapter.title}`;
}

function episodeLabel(episode: ComicEpisodeRecord) {
  return `Episode ${episode.episodeNumber}: ${episode.title}`;
}

function outlineStudioHref(scope: OutlineScope, id?: string) {
  const params = new URLSearchParams({ scope });

  if (id) {
    params.set("id", id);
  }

  return `/admin/comic/outline-studio?${params.toString()}`;
}

function publishCenterEpisodeHref(chapterId: string, episodeId: string) {
  return `/admin/comic/publish-center/chapters/${chapterId}#episode-${episodeId}`;
}

export default async function AdminComicOutlineStudioPage({
  searchParams
}: AdminComicOutlineStudioPageProps) {
  const [params, pageData, openAiSettings] = await Promise.all([
    searchParams,
    getComicOutlineStudioPage(null),
    Promise.resolve(getOpenAiComicSettings())
  ]);
  const project = pageData.project;
  const projectOutlineReady = hasUsableOutline(project?.storyOutline);
  const disabledForAi = !openAiSettings.ready;
  const seasonCount = pageData.seasons.length;
  const chapterCount = pageData.seasons.reduce(
    (sum, season) => sum + season.chapters.length,
    0
  );
  const episodeCount = pageData.seasons.reduce(
    (sum, season) =>
      sum + season.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.episodes.length, 0),
    0
  );
  const requestedScope =
    params.scope === "season" || params.scope === "chapter" || params.scope === "episode"
      ? params.scope
      : "project";
  const requestedId = params.id || "";
  let activeScope: OutlineScope = "project";
  let activeSeason: (typeof pageData.seasons)[number] | null = null;
  let activeChapter: (typeof pageData.seasons)[number]["chapters"][number] | null = null;
  let activeEpisode:
    | (typeof pageData.seasons)[number]["chapters"][number]["episodes"][number]
    | null = null;

  for (const season of pageData.seasons) {
    if (requestedScope === "season" && season.id === requestedId) {
      activeScope = "season";
      activeSeason = season;
    }

    for (const chapter of season.chapters) {
      if (requestedScope === "chapter" && chapter.id === requestedId) {
        activeScope = "chapter";
        activeSeason = season;
        activeChapter = chapter;
      }

      for (const episode of chapter.episodes) {
        if (requestedScope === "episode" && episode.id === requestedId) {
          activeScope = "episode";
          activeSeason = season;
          activeChapter = chapter;
          activeEpisode = episode;
        }
      }
    }
  }

  return (
    <ComicImageTaskQueueProvider maxConcurrent={3}>
      <div className="admin-page admin-page--comic-outline">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          Back to comic
        </Link>
        <Link href="/admin/comic/publish-center" className="button button--ghost">
          Publish Center
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Outline Studio</p>
        <h1>双语大纲工作台</h1>
        <p>
          每个大纲左侧显示中文、右侧显示英文；文本框只用于提交修改需求。
          Episode 大纲确认后直接生成 Episode Prompts，再进入 Publish Center 制作页面。
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Comic outline action completed: ${params.status}.`}
        </p>
      ) : null}

      <div className="cards-3">
        <section className="admin-card">
          <p className="eyebrow">Structure</p>
          <h3>
            {seasonCount} / {chapterCount} / {episodeCount}
          </h3>
          <p>Seasons, Chapters, Episodes</p>
        </section>
        <section className="admin-card">
          <p className="eyebrow">Current AI model</p>
          <h3>{openAiSettings.model}</h3>
          <p>{openAiSettings.ready ? "OpenAI key is configured." : "Set OPENAI_API_KEY first."}</p>
        </section>
        <section className="admin-card">
          <p className="eyebrow">Next step</p>
          <h3>Prompts → Publish Center</h3>
          <p>双语 Episode 大纲会作为上游 canon，生成英文 prompts 后直接进入制作和发布。</p>
        </section>
      </div>

      <div className="admin-comic-outline-layout">
        <aside className="admin-form admin-comic-outline-nav">
          <h2>大纲目录</h2>
          <nav aria-label="Comic outline sections">
            <Link
              href={outlineStudioHref("project")}
              className={activeScope === "project" ? "is-active" : undefined}
            >
              整部漫画
            </Link>
            {pageData.seasons.map((season) => (
              <details key={season.id} open={activeScope === "project" || activeSeason?.id === season.id}>
                <summary>{seasonLabel(season)}</summary>
                <div>
                  <Link
                    href={outlineStudioHref("season", season.id)}
                    className={
                      activeScope === "season" && activeSeason?.id === season.id ? "is-active" : undefined
                    }
                  >
                    Season 大纲
                  </Link>
                  {season.chapters.map((chapter) => (
                    <details
                      key={chapter.id}
                      open={activeScope === "project" || activeChapter?.id === chapter.id}
                    >
                      <summary>{chapterLabel(chapter)}</summary>
                      <div>
                        <Link
                          href={outlineStudioHref("chapter", chapter.id)}
                          className={
                            activeScope === "chapter" && activeChapter?.id === chapter.id
                              ? "is-active"
                              : undefined
                          }
                        >
                          Chapter 大纲
                        </Link>
                        {chapter.episodes.map((episode) => (
                          <Link
                            key={episode.id}
                            href={outlineStudioHref("episode", episode.id)}
                            className={
                              activeScope === "episode" && activeEpisode?.id === episode.id
                                ? "is-active"
                                : undefined
                            }
                          >
                            {episodeLabel(episode)}
                          </Link>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </nav>
        </aside>

        <div className="admin-comic-outline-stack">
          {activeScope === "project" ? (
            <ProjectOutlineSection
              project={project}
              seasonCount={seasonCount}
              disabledForAi={disabledForAi}
            />
          ) : null}

          {activeScope === "season" && activeSeason ? (
            <section className="admin-comic-outline-group">
              <SeasonOutlineSection
                season={activeSeason}
                disabledForAi={disabledForAi}
                projectOutlineReady={projectOutlineReady}
              />

              {activeSeason.chapters.map((chapter) => (
                <section key={chapter.id} className="admin-comic-outline-subgroup">
                  <ChapterOutlineSection
                    season={activeSeason}
                    chapter={chapter}
                    disabledForAi={disabledForAi}
                  />

                  {chapter.episodes.map((episode) => (
                    <EpisodeOutlineSection
                      key={episode.id}
                      episode={episode}
                      chapter={chapter}
                      disabledForAi={disabledForAi}
                    />
                  ))}
                </section>
              ))}
            </section>
          ) : null}

          {activeScope === "chapter" && activeSeason && activeChapter ? (
            <section className="admin-comic-outline-subgroup">
              <ChapterOutlineSection
                season={activeSeason}
                chapter={activeChapter}
                disabledForAi={disabledForAi}
              />

              {activeChapter.episodes.map((episode) => (
                <EpisodeOutlineSection
                  key={episode.id}
                  episode={episode}
                  chapter={activeChapter}
                  disabledForAi={disabledForAi}
                />
              ))}
            </section>
          ) : null}

          {activeScope === "episode" && activeChapter && activeEpisode ? (
            <EpisodeOutlineSection
              episode={activeEpisode}
              chapter={activeChapter}
              disabledForAi={disabledForAi}
            />
          ) : null}
        </div>
      </div>
      </div>
    </ComicImageTaskQueueProvider>
  );
}

function ProjectOutlineSection({
  project,
  seasonCount,
  disabledForAi
}: {
  project: ComicProjectRecord | null;
  seasonCount: number;
  disabledForAi: boolean;
}) {
  const projectId = project?.id || "";
  const projectOutlineReady = hasUsableOutline(project?.storyOutline);
  const generationDisabledReason = disabledForAi
    ? "OPENAI_API_KEY 还没有配置。"
    : !projectId
      ? "还没有整部漫画记录。"
      : undefined;
  const seasonGenerationDisabledReason = disabledForAi
    ? "OPENAI_API_KEY 还没有配置。"
    : !projectOutlineReady
      ? "请先确认整部漫画大纲。"
      : seasonCount === 0
        ? "还没有 Season。"
        : undefined;

  return (
    <OutlinePanel
      id="project-outline"
      eyebrow="Project outline"
      title={project?.title || "Neatique Comic Universe"}
      summary={project?.shortDescription}
      outline={project?.storyOutline}
      meta={<span className="pill">{seasonCount} seasons</span>}
    >
      <div className="admin-comic-outline-actions">
        <ComicOutlineMultiActionForm
          textareaId={`project-outline-actions-${projectId || "missing"}`}
          actions={[
            {
              taskType: "project-generate",
              targetId: projectId,
              taskLabel: "Regenerate project outline",
              idleLabel: projectOutlineReady
                ? "根据修改需求重新生成整部漫画大纲"
                : "生成整部漫画大纲",
              includeRevisionNotes: true,
              disabled: Boolean(generationDisabledReason),
              disabledReason: generationDisabledReason
            },
            {
              taskType: "seasons-generate",
              targetId: projectId,
              taskLabel: "Generate all season outlines",
              idleLabel: "确定整部漫画大纲并生成对应Season大纲",
              includeRevisionNotes: false,
              disabled: Boolean(seasonGenerationDisabledReason),
              disabledReason: seasonGenerationDisabledReason
            }
          ]}
        />
      </div>
    </OutlinePanel>
  );
}

function SeasonOutlineSection({
  season,
  disabledForAi,
  projectOutlineReady
}: {
  season: ComicSeasonRecord & {
    chapters: Array<
      ComicChapterRecord & {
        episodes: ComicEpisodeRecord[];
      }
    >;
  };
  disabledForAi: boolean;
  projectOutlineReady: boolean;
}) {
  const seasonOutlineReady = hasUsableOutline(season.outline);
  const generationDisabledReason = disabledForAi
    ? "OPENAI_API_KEY 还没有配置。"
    : !projectOutlineReady
      ? "请先确认整部漫画大纲。"
      : undefined;
  const chapterGenerationDisabledReason = disabledForAi
    ? "OPENAI_API_KEY 还没有配置。"
    : !seasonOutlineReady
      ? "请先确认 Season 大纲。"
      : season.chapters.length === 0
        ? "本季还没有 Chapter。"
        : undefined;

  return (
    <OutlinePanel
      id={`season-${season.id}`}
      eyebrow="Season outline"
      title={seasonLabel(season)}
      summary={season.summary}
      outline={season.outline}
      meta={<span className="pill">{season.chapters.length} chapters</span>}
    >
      <div className="admin-comic-outline-actions">
        <ComicOutlineMultiActionForm
          textareaId={`season-outline-actions-${season.id}`}
          actions={[
            {
              taskType: "season-generate",
              targetId: season.id,
              taskLabel: `Regenerate ${seasonLabel(season)}`,
              idleLabel: seasonOutlineReady
                ? "根据修改需求重新生成Season大纲"
                : "生成Season大纲",
              includeRevisionNotes: true,
              disabled: Boolean(generationDisabledReason),
              disabledReason: generationDisabledReason
            },
            {
              taskType: "chapters-generate",
              targetId: season.id,
              taskLabel: `Generate chapters for ${seasonLabel(season)}`,
              idleLabel: "确定Season大纲并生成对应Chapter大纲",
              includeRevisionNotes: false,
              disabled: Boolean(chapterGenerationDisabledReason),
              disabledReason: chapterGenerationDisabledReason
            }
          ]}
        />
      </div>
    </OutlinePanel>
  );
}

function ChapterOutlineSection({
  season,
  chapter,
  disabledForAi
}: {
  season: ComicSeasonRecord;
  chapter: ComicChapterRecord & {
    episodes: ComicEpisodeRecord[];
  };
  disabledForAi: boolean;
}) {
  const seasonOutlineReady = hasUsableOutline(season.outline);
  const chapterOutlineReady = hasUsableOutline(chapter.outline);
  const generationDisabledReason = disabledForAi
    ? "OPENAI_API_KEY 还没有配置。"
    : !seasonOutlineReady
      ? "请先确认 Season 大纲。"
      : undefined;
  const episodeGenerationDisabledReason = disabledForAi
    ? "OPENAI_API_KEY 还没有配置。"
    : !chapterOutlineReady
      ? "请先确认 Chapter 大纲。"
      : chapter.episodes.length === 0
        ? "本章还没有 Episode。"
        : undefined;

  return (
    <OutlinePanel
      id={`chapter-${chapter.id}`}
      eyebrow={`${seasonLabel(season)} / Chapter outline`}
      title={chapterLabel(chapter)}
      summary={chapter.summary}
      outline={chapter.outline}
      meta={<span className="pill">{chapter.episodes.length} episodes</span>}
    >
      <div className="admin-comic-outline-actions">
        <ComicOutlineMultiActionForm
          textareaId={`chapter-outline-actions-${chapter.id}`}
          actions={[
            {
              taskType: "chapter-generate",
              targetId: chapter.id,
              taskLabel: `Regenerate ${chapterLabel(chapter)}`,
              idleLabel: "根据修改需求重新生成Chapter大纲",
              includeRevisionNotes: true,
              disabled: Boolean(generationDisabledReason),
              disabledReason: generationDisabledReason
            },
            {
              taskType: "episodes-generate",
              targetId: chapter.id,
              taskLabel: `Generate episodes for ${chapterLabel(chapter)}`,
              idleLabel: "确定Chapter大纲并生成对应Episode大纲",
              includeRevisionNotes: false,
              disabled: Boolean(episodeGenerationDisabledReason),
              disabledReason: episodeGenerationDisabledReason
            }
          ]}
        />
      </div>
    </OutlinePanel>
  );
}

function EpisodeOutlineSection({
  episode,
  chapter,
  disabledForAi
}: {
  episode: ComicEpisodeRecord;
  chapter: ComicChapterRecord;
  disabledForAi: boolean;
}) {
  const chapterOutlineReady = hasUsableOutline(chapter.outline);
  const episodeOutlineReady = hasUsableOutline(episode.outline);
  const generationDisabledReason = disabledForAi
    ? "OPENAI_API_KEY 还没有配置。"
    : !chapterOutlineReady
      ? "请先确认 Chapter 大纲。"
      : undefined;
  const promptDisabledReason = disabledForAi
    ? "OPENAI_API_KEY 还没有配置。"
    : !episodeOutlineReady
      ? "请先确认 Episode 大纲。"
      : undefined;

  return (
    <OutlinePanel
      id={`episode-${episode.id}`}
      eyebrow={`${chapterLabel(chapter)} / Episode outline`}
      title={episodeLabel(episode)}
      summary={episode.summary}
      outline={episode.outline}
      meta={
        <>
          <span className="pill">{episode.promptPack ? "Prompts exist" : "No prompts"}</span>
          {episode.latestPromptRunAt ? <span className="pill">AI run exists</span> : null}
        </>
      }
    >
      <div className="admin-comic-outline-actions">
        <ComicOutlineMultiActionForm
          textareaId={`episode-outline-actions-${episode.id}`}
          actions={[
            {
              taskType: "episode-generate",
              targetId: episode.id,
              taskLabel: `Regenerate ${episodeLabel(episode)}`,
              idleLabel: "重新生成Episode大纲",
              includeRevisionNotes: true,
              disabled: Boolean(generationDisabledReason),
              disabledReason: generationDisabledReason
            },
            {
              actionType: "prompt-package",
              episodeId: episode.id,
              taskLabel: `Prompts: ${episode.title}`,
              idleLabel: "应用大纲并生成Page Prompts",
              disabled: Boolean(promptDisabledReason),
              disabledReason: promptDisabledReason
            },
            {
              actionType: "link",
              href: publishCenterEpisodeHref(chapter.id, episode.id),
              idleLabel: "进入Publish Center"
            }
          ]}
        />
      </div>
    </OutlinePanel>
  );
}
