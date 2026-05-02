import Link from "next/link";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import {
  generateComicChapterOutlineAction,
  generateComicChapterOutlinesAction,
  generateComicEpisodeOutlineAction,
  generateComicEpisodeOutlinesAction,
  generateComicProjectOutlineAction,
  generateComicSeasonOutlineAction,
  generateComicSeasonOutlinesAction
} from "@/app/admin/comic-outline-actions";
import { getComicPromptStudioPage } from "@/lib/comic-queries";
import { getOpenAiComicSettings } from "@/lib/openai-comic";
import type {
  ComicChapterRecord,
  ComicEpisodeRecord,
  ComicProjectRecord,
  ComicSeasonRecord
} from "@/lib/types";

type AdminComicOutlineStudioPageProps = {
  searchParams: Promise<{ status?: string }>;
};

type FormAction = (formData: FormData) => Promise<void>;

type OutlineFormField = {
  name: string;
  value?: string | number | null;
};

const STATUS_MESSAGES: Record<string, string> = {
  "project-outline-generated": "整部漫画中文大纲已更新。",
  "season-outline-generated": "Season 中文大纲已更新。",
  "chapter-outline-generated": "Chapter 中文大纲已更新。",
  "episode-outline-generated": "Episode 中文大纲已更新。",
  "season-outlines-generated": "已根据整部漫画大纲生成所有 Season 中文大纲。",
  "chapter-outlines-generated": "已根据 Season 大纲生成所有 Chapter 中文大纲。",
  "episode-outlines-generated": "已根据 Chapter 大纲生成所有 Episode 中文大纲。",
  "outline-failed": "大纲生成失败。请检查 OpenAI key、模型设置或稍后重试。",
  "missing-parent-outline": "请先生成并确认上一级大纲，再生成下一层级。",
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

function hasChineseText(value?: string | null) {
  return /[\u4e00-\u9fff]/.test(value || "");
}

function getOutlineStatusLabel(outline?: string | null) {
  if (!hasUsableOutline(outline)) {
    return "未生成";
  }

  return hasChineseText(outline) ? "中文已就绪" : "需要中文化";
}

function getOutlineStatusClass(outline?: string | null) {
  if (!hasUsableOutline(outline)) {
    return "admin-table__status-badge admin-table__status-badge--warning";
  }

  return hasChineseText(outline)
    ? "admin-table__status-badge admin-table__status-badge--success"
    : "admin-table__status-badge admin-table__status-badge--warning";
}

function getOutlineWordCount(outline?: string | null) {
  return (outline || "").trim().length;
}

function getTextareaId(prefix: string, id: string) {
  return `${prefix}-${id}-revision`;
}

function OutlineActionForm({
  action,
  hiddenFields,
  textareaId,
  idleLabel,
  pendingLabel,
  modalTitle,
  disabled,
  disabledReason
}: {
  action: FormAction;
  hiddenFields: OutlineFormField[];
  textareaId: string;
  idleLabel: string;
  pendingLabel: string;
  modalTitle: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <form action={action} className="admin-comic-outline-form">
      {hiddenFields.map((field) => (
        <input
          key={`${textareaId}-${field.name}`}
          type="hidden"
          name={field.name}
          value={field.value ?? ""}
        />
      ))}
      <div className="field">
        <label htmlFor={textareaId}>修改意见</label>
        <textarea
          id={textareaId}
          name="revisionNotes"
          rows={3}
          placeholder="可留空；也可以写：节奏更轻松、加强 Nia 的动机、结尾留更强悬念..."
        />
      </div>
      <div className="stack-row">
        <PendingSubmitButton
          idleLabel={idleLabel}
          pendingLabel={pendingLabel}
          modalTitle={modalTitle}
          modalDescription="正在读取上级大纲、人物名称和现有结构，生成中文漫画大纲。"
          disabled={disabled}
        />
        {disabled && disabledReason ? <span className="form-note">{disabledReason}</span> : null}
      </div>
    </form>
  );
}

function OutlineTextBlock({
  summary,
  outline
}: {
  summary?: string | null;
  outline?: string | null;
}) {
  const hasOutline = hasUsableOutline(outline);

  return (
    <div className="admin-comic-outline-text">
      {summary ? (
        <div className="admin-comic-outline-summary">
          <strong>摘要</strong>
          <p>{summary}</p>
        </div>
      ) : null}
      {hasOutline ? (
        <pre>{outline}</pre>
      ) : (
        <p className="form-note">
          暂无可用大纲。先生成上一级大纲，再在这里生成当前层级的中文大纲。
        </p>
      )}
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

function buildProjectRedirect() {
  return "/admin/comic/outline-studio#project-outline";
}

function buildSeasonRedirect(id: string) {
  return `/admin/comic/outline-studio#season-${id}`;
}

function buildChapterRedirect(id: string) {
  return `/admin/comic/outline-studio#chapter-${id}`;
}

function buildEpisodeRedirect(id: string) {
  return `/admin/comic/outline-studio#episode-${id}`;
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

export default async function AdminComicOutlineStudioPage({
  searchParams
}: AdminComicOutlineStudioPageProps) {
  const [params, pageData, openAiSettings] = await Promise.all([
    searchParams,
    getComicPromptStudioPage(null),
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

  return (
    <div className="admin-page admin-page--comic-outline">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          Back to comic
        </Link>
        <Link href="/admin/comic/prompt-studio" className="button button--ghost">
          Prompt Studio
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Outline Studio</p>
        <h1>中文大纲工作台</h1>
        <p>
          按整部漫画、Season、Chapter、Episode 的顺序确认大纲；人物名称保持英文，Episode
          大纲确认后再进入英文 page prompts。
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
          <h3>Episode prompts stay English</h3>
          <p>中文 Episode 大纲会作为上游 canon，Prompt Studio 会生成英文分镜 prompts。</p>
        </section>
      </div>

      <div className="admin-comic-outline-layout">
        <aside className="admin-form admin-comic-outline-nav">
          <h2>大纲目录</h2>
          <nav aria-label="Comic outline sections">
            <a href="#project-outline">整部漫画</a>
            {pageData.seasons.map((season) => (
              <details key={season.id} open>
                <summary>{seasonLabel(season)}</summary>
                <div>
                  <a href={`#season-${season.id}`}>Season 大纲</a>
                  {season.chapters.map((chapter) => (
                    <details key={chapter.id}>
                      <summary>{chapterLabel(chapter)}</summary>
                      <div>
                        <a href={`#chapter-${chapter.id}`}>Chapter 大纲</a>
                        {chapter.episodes.map((episode) => (
                          <a key={episode.id} href={`#episode-${episode.id}`}>
                            {episodeLabel(episode)}
                          </a>
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
          <ProjectOutlineSection
            project={project}
            seasonCount={seasonCount}
            disabledForAi={disabledForAi}
          />

          {pageData.seasons.map((season) => (
            <section key={season.id} className="admin-comic-outline-group">
              <SeasonOutlineSection
                season={season}
                project={project}
                disabledForAi={disabledForAi}
                projectOutlineReady={projectOutlineReady}
              />

              {season.chapters.map((chapter) => (
                <section key={chapter.id} className="admin-comic-outline-subgroup">
                  <ChapterOutlineSection
                    season={season}
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
          ))}
        </div>
      </div>
    </div>
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
        <OutlineActionForm
          action={generateComicProjectOutlineAction}
          hiddenFields={[
            { name: "projectId", value: project?.id },
            { name: "redirectTo", value: buildProjectRedirect() }
          ]}
          textareaId="project-outline-revision"
          idleLabel={hasUsableOutline(project?.storyOutline) ? "重新生成整部漫画大纲" : "生成整部漫画大纲"}
          pendingLabel="生成中..."
          modalTitle="生成整部漫画大纲"
          disabled={disabledForAi}
          disabledReason={disabledForAi ? "OPENAI_API_KEY 还没有配置。" : undefined}
        />
        <OutlineActionForm
          action={generateComicSeasonOutlinesAction}
          hiddenFields={[
            { name: "projectId", value: project?.id },
            { name: "redirectTo", value: buildProjectRedirect() }
          ]}
          textareaId="project-children-outline-revision"
          idleLabel="根据整部大纲生成所有 Season"
          pendingLabel="生成 Season 中..."
          modalTitle="生成 Season 大纲"
          disabled={disabledForAi || !hasUsableOutline(project?.storyOutline) || seasonCount === 0}
          disabledReason={
            disabledForAi
              ? "OPENAI_API_KEY 还没有配置。"
              : !hasUsableOutline(project?.storyOutline)
                ? "请先生成整部漫画大纲。"
                : seasonCount === 0
                  ? "还没有 Season。"
                  : undefined
          }
        />
      </div>
    </OutlinePanel>
  );
}

function SeasonOutlineSection({
  season,
  project,
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
  project: ComicProjectRecord | null;
  disabledForAi: boolean;
  projectOutlineReady: boolean;
}) {
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
        <OutlineActionForm
          action={generateComicSeasonOutlineAction}
          hiddenFields={[
            { name: "seasonId", value: season.id },
            { name: "redirectTo", value: buildSeasonRedirect(season.id) }
          ]}
          textareaId={getTextareaId("season", season.id)}
          idleLabel={hasUsableOutline(season.outline) ? "重新生成 Season 大纲" : "生成 Season 大纲"}
          pendingLabel="生成中..."
          modalTitle={`生成 ${seasonLabel(season)} 大纲`}
          disabled={disabledForAi || !projectOutlineReady}
          disabledReason={
            disabledForAi
              ? "OPENAI_API_KEY 还没有配置。"
              : !projectOutlineReady
                ? "请先生成整部漫画大纲。"
                : undefined
          }
        />
        <OutlineActionForm
          action={generateComicChapterOutlinesAction}
          hiddenFields={[
            { name: "seasonId", value: season.id },
            { name: "redirectTo", value: buildSeasonRedirect(season.id) }
          ]}
          textareaId={getTextareaId("season-children", season.id)}
          idleLabel="根据 Season 生成所有 Chapter"
          pendingLabel="生成 Chapter 中..."
          modalTitle={`生成 ${seasonLabel(season)} 的 Chapter 大纲`}
          disabled={disabledForAi || !hasUsableOutline(season.outline) || season.chapters.length === 0}
          disabledReason={
            disabledForAi
              ? "OPENAI_API_KEY 还没有配置。"
              : !hasUsableOutline(season.outline)
                ? "请先确认 Season 大纲。"
                : season.chapters.length === 0
                  ? "本季还没有 Chapter。"
                  : undefined
          }
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
        <OutlineActionForm
          action={generateComicChapterOutlineAction}
          hiddenFields={[
            { name: "chapterId", value: chapter.id },
            { name: "redirectTo", value: buildChapterRedirect(chapter.id) }
          ]}
          textareaId={getTextareaId("chapter", chapter.id)}
          idleLabel={hasUsableOutline(chapter.outline) ? "重新生成 Chapter 大纲" : "生成 Chapter 大纲"}
          pendingLabel="生成中..."
          modalTitle={`生成 ${chapterLabel(chapter)} 大纲`}
          disabled={disabledForAi || !seasonOutlineReady}
          disabledReason={
            disabledForAi
              ? "OPENAI_API_KEY 还没有配置。"
              : !seasonOutlineReady
                ? "请先确认 Season 大纲。"
                : undefined
          }
        />
        <OutlineActionForm
          action={generateComicEpisodeOutlinesAction}
          hiddenFields={[
            { name: "chapterId", value: chapter.id },
            { name: "redirectTo", value: buildChapterRedirect(chapter.id) }
          ]}
          textareaId={getTextareaId("chapter-children", chapter.id)}
          idleLabel="确认并生成所有 Episode 大纲"
          pendingLabel="生成 Episode 中..."
          modalTitle={`生成 ${chapterLabel(chapter)} 的 Episode 大纲`}
          disabled={disabledForAi || !hasUsableOutline(chapter.outline) || chapter.episodes.length === 0}
          disabledReason={
            disabledForAi
              ? "OPENAI_API_KEY 还没有配置。"
              : !hasUsableOutline(chapter.outline)
                ? "请先确认 Chapter 大纲。"
                : chapter.episodes.length === 0
                  ? "本章还没有 Episode。"
                  : undefined
          }
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
        <OutlineActionForm
          action={generateComicEpisodeOutlineAction}
          hiddenFields={[
            { name: "episodeId", value: episode.id },
            { name: "redirectTo", value: buildEpisodeRedirect(episode.id) }
          ]}
          textareaId={getTextareaId("episode", episode.id)}
          idleLabel={hasUsableOutline(episode.outline) ? "重新生成 Episode 大纲" : "生成 Episode 大纲"}
          pendingLabel="生成中..."
          modalTitle={`生成 ${episodeLabel(episode)} 大纲`}
          disabled={disabledForAi || !chapterOutlineReady}
          disabledReason={
            disabledForAi
              ? "OPENAI_API_KEY 还没有配置。"
              : !chapterOutlineReady
                ? "请先确认 Chapter 大纲。"
                : undefined
          }
        />
        <div className="admin-comic-outline-next-step">
          <Link
            href={`/admin/comic/prompt-studio?episodeId=${episode.id}`}
            className="button button--secondary"
          >
            进入英文 Prompts
          </Link>
        </div>
      </div>
    </OutlinePanel>
  );
}
