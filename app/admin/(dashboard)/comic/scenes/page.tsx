import Link from "next/link";
import Image from "next/image";
import { getComicProject, getComicScenes } from "@/lib/comic-queries";
import {
  getComicReferenceChapterEntries,
  getComicReferenceSceneSlugs,
  getComicSceneReferenceFiles
} from "@/lib/comic-reference-manifest";
import { toComicReferenceMediaUrl } from "@/lib/comic-reference-images";

type AdminComicScenesPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "场景已创建。",
  saved: "场景已更新。",
  "missing-fields": "请先填写必填的场景字段。",
  "missing-scene": "没有找到这个场景。"
};

function formatExtraReferenceTitle(value: string) {
  return value
    .split(/[\/_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminComicScenesPage({
  searchParams
}: AdminComicScenesPageProps) {
  const [project, scenes, params] = await Promise.all([
    getComicProject(),
    getComicScenes(),
    searchParams
  ]);
  const sceneSlugs = new Set(scenes.map((scene) => scene.slug));
  const chapterReferenceEntries = getComicReferenceChapterEntries();
  const chapterReferencePaths = new Set(
    chapterReferenceEntries.flatMap((entry) =>
      entry.references.map((reference) => reference.relativePath)
    )
  );
  const extraReferenceGroups = [
    ...getComicReferenceSceneSlugs()
      .filter((slug) => !sceneSlugs.has(slug))
      .map((slug) => ({
        key: `scene:${slug}`,
        title: formatExtraReferenceTitle(slug),
        references: getComicSceneReferenceFiles(slug).filter(
          (reference) => !chapterReferencePaths.has(reference.relativePath)
        )
      })),
    ...chapterReferenceEntries.map((entry) => ({
      key: `chapter:${entry.key}`,
      title: formatExtraReferenceTitle(entry.key),
      references: entry.references
    }))
  ].filter((group) => group.references.length > 0);

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          返回漫画后台
        </Link>
        <Link href="/admin/comic/scenes/new" className="button button--primary">
          新增场景
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">漫画 / 场景</p>
        <h1>管理可复用场景库。</h1>
        <p>
          场景用于固定地点、气氛、背景逻辑和参考图。生成页面时会把这些内容作为环境锁定一起读取。
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Comic action completed: ${params.status}.`}
        </p>
      ) : null}

      {!project ? (
        <p className="notice notice--warning">
          建议先保存漫画总设定，这样场景库会更自然地挂在同一个故事圣经下。
        </p>
      ) : null}

      <div className="admin-product-grid">
        {scenes.map((scene) => {
          const references = getComicSceneReferenceFiles(scene.slug);

          return (
            <article key={scene.id} className="admin-product-card">
              <div className="admin-product-card__body">
                <div className="product-card__meta">
                  <span>{scene.active ? "启用" : "停用"}</span>
                  <span>{scene.slug}</span>
                </div>
                <h3>{scene.name}</h3>
                <p>{scene.summary}</p>
                {references.length > 0 ? (
                  <div className="admin-comic-reference-strip" aria-label={`${scene.name} 参考图`}>
                    {references.slice(0, 4).map((reference) => (
                      <Image
                        key={reference.relativePath}
                        src={toComicReferenceMediaUrl(reference.relativePath)}
                        alt={`${scene.name} ${reference.label}`}
                        width={96}
                        height={96}
                      />
                    ))}
                    {references.length > 4 ? <span>+{references.length - 4}</span> : null}
                  </div>
                ) : (
                  <p className="form-note">还没有上传场景图。</p>
                )}
                <div className="stack-row">
                  <span className="pill">{scene.referenceFolder}</span>
                </div>
                <div className="stack-row">
                  <Link href={`/admin/comic/scenes/${scene.id}`} className="button button--primary">
                    编辑场景
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {extraReferenceGroups.length > 0 ? (
        <section className="admin-form">
          <h2>Extra References</h2>
          <p className="form-note">
            Production-only reference sheets and chapter props live here, including height
            comparisons, handbook/book assets, and recurring clue objects.
          </p>
          <div className="admin-product-grid">
            {extraReferenceGroups.map((group) => (
              <article key={group.key} className="admin-product-card">
                <div className="admin-product-card__body">
                  <div className="product-card__meta">
                    <span>Extra Reference</span>
                    <span>{group.references.length} image{group.references.length === 1 ? "" : "s"}</span>
                  </div>
                  <h3>{group.title}</h3>
                  <div className="admin-comic-reference-strip" aria-label={`${group.title} references`}>
                    {group.references.slice(0, 4).map((reference) => (
                      <Image
                        key={reference.relativePath}
                        src={toComicReferenceMediaUrl(reference.relativePath)}
                        alt={`${group.title} ${reference.label}`}
                        width={96}
                        height={96}
                      />
                    ))}
                    {group.references.length > 4 ? (
                      <span>+{group.references.length - 4}</span>
                    ) : null}
                  </div>
                  <div className="stack-row">
                    {group.references.map((reference) => (
                      <a
                        key={reference.relativePath}
                        href={toComicReferenceMediaUrl(reference.relativePath)}
                        target="_blank"
                        rel="noreferrer"
                        className="pill"
                      >
                        {reference.label}
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {scenes.length === 0 ? (
        <section className="admin-form">
          <h2>还没有场景</h2>
          <p className="form-note">
            先新增第一个固定地点，然后可以直接在页面上传背景、光线和布局参考图。
          </p>
        </section>
      ) : null}
    </div>
  );
}
