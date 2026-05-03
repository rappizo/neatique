import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  restoreComicSceneLockAction,
  updateComicSceneAction,
  uploadComicSceneReferenceAction
} from "@/app/admin/comic-editor-actions";
import {
  ComicImageTaskQueueProvider,
  ComicSceneLockRevisionQueueForm
} from "@/components/admin/comic-image-task-queue";
import { getComicSceneById } from "@/lib/comic-queries";
import { getComicSceneLockHistory } from "@/lib/comic-lock-history";
import { getComicSceneReferenceFiles } from "@/lib/comic-reference-manifest";
import { toComicReferenceMediaUrl } from "@/lib/comic-reference-images";

type AdminComicSceneDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "场景已创建。",
  saved: "场景已更新。",
  "missing-fields": "请先填写必填的场景字段。",
  "reference-uploaded": "场景参考图已上传。",
  "missing-reference-upload": "请选择一张要上传的场景参考图。",
  "reference-upload-too-large": "参考图不能超过 20 MB。",
  "reference-upload-type": "参考图必须是 PNG、JPG、JPEG 或 WEBP。",
  "reference-upload-failed": "参考图上传失败，请稍后再试。",
  "lock-revised": "场景锁定内容已根据修改意见更新。",
  "lock-revision-missing": "请先输入修改意见。",
  "lock-revision-failed": "场景锁定内容更新失败，请检查 OpenAI 配置或稍后再试。",
  "lock-restored": "场景锁定内容已回溯到旧版本。",
  "missing-lock-history": "没有找到这个旧版本。"
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});

function formatHistoryDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export default async function AdminComicSceneDetailPage({
  params,
  searchParams
}: AdminComicSceneDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const scene = await getComicSceneById(id);

  if (!scene) {
    notFound();
  }

  const [referenceFiles, lockHistory] = await Promise.all([
    Promise.resolve(getComicSceneReferenceFiles(scene.slug)),
    getComicSceneLockHistory(scene.id)
  ]);

  return (
    <ComicImageTaskQueueProvider maxConcurrent={3}>
      <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic/scenes" className="button button--secondary">
          返回场景列表
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">漫画 / 场景</p>
        <h1>编辑 {scene.name}</h1>
        <p>
          这里管理可复用场景的环境锁定。后续生成 Prompt 和页面图时，会同时读取场景文字规则和参考图。
        </p>
      </div>

      {query.status ? (
        <p className="notice">
          {STATUS_MESSAGES[query.status] || `漫画操作已完成：${query.status}。`}
        </p>
      ) : null}

      <section className="admin-form" id="references">
        <h2>场景参考图</h2>
        <p className="form-note">
          上传场景布局、光线、道具或情绪参考图。填写同名文件时会覆盖旧图，适合更新主场景图。
        </p>

        {referenceFiles.length > 0 ? (
          <div className="admin-comic-reference-grid">
            {referenceFiles.map((reference) => (
              <a
                key={reference.relativePath}
                className="admin-comic-reference-card"
                href={toComicReferenceMediaUrl(reference.relativePath)}
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src={toComicReferenceMediaUrl(reference.relativePath)}
                  alt={`${scene.name} ${reference.label}`}
                  width={240}
                  height={240}
                />
                <span>{reference.label}</span>
                <small>{reference.fileName}</small>
              </a>
            ))}
          </div>
        ) : (
          <p className="notice notice--warning">还没有上传场景图。生成页面时会更依赖文字锁定。</p>
        )}

        <form action={uploadComicSceneReferenceAction}>
          <input type="hidden" name="id" value={scene.id} />
          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-scene-reference-image">本地图片</label>
              <input
                id="comic-scene-reference-image"
                name="referenceImage"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="comic-scene-reference-label">显示名称</label>
              <input
                id="comic-scene-reference-label"
                name="label"
                placeholder="例如：主背景图 / 夜景灯光"
              />
            </div>
            <div className="field">
              <label htmlFor="comic-scene-reference-filename">保存为文件名</label>
              <input
                id="comic-scene-reference-filename"
                name="fileName"
                placeholder="留空使用原文件名；同名会覆盖"
              />
            </div>
          </div>
          <button type="submit" className="button button--primary">
            上传或覆盖场景图
          </button>
        </form>
      </section>

      <section className="admin-form" id="lock">
        <h2>场景锁定内容</h2>
        <p className="form-note">
          这部分会作为 MD 风格的场景资料参与后续 Prompt 和图片生成，主要负责地点、构图、气氛和连续性。
        </p>
        <div className="admin-comic-lock-grid">
          <div className="admin-comic-lock-block">
            <h3>场景摘要</h3>
            <pre>{scene.summary}</pre>
          </div>
          <div className="admin-comic-lock-block">
            <h3>视觉锁定</h3>
            <pre>{scene.visualNotes}</pre>
          </div>
          <div className="admin-comic-lock-block">
            <h3>气氛锁定</h3>
            <pre>{scene.moodNotes}</pre>
          </div>
          <div className="admin-comic-lock-block">
            <h3>参考图使用规则</h3>
            <pre>{scene.referenceNotes || "暂无参考图使用规则。"}</pre>
          </div>
        </div>

        <ComicSceneLockRevisionQueueForm sceneId={scene.id} sceneName={scene.name} />
        <form hidden aria-hidden="true">
          <input type="hidden" name="id" value={scene.id} />
          <div className="field">
            <label htmlFor="comic-scene-lock-revision">修改意见</label>
            <textarea
              id="comic-scene-lock-revision"
              name="revisionInstruction"
              rows={5}
              placeholder="例如：把夜景版本和白天版本的灯光差异写清楚，并强调固定的入口、招牌和背景道具。"
              required
            />
          </div>
          <button type="submit" className="button button--primary">
            根据意见更新锁定
          </button>
        </form>
      </section>

      <section className="admin-form" id="history">
        <h2>最近 5 个旧锁定</h2>
        {lockHistory.length > 0 ? (
          <div className="admin-comic-lock-history">
            {lockHistory.map((snapshot) => (
              <article key={snapshot.id} className="admin-comic-lock-history__item">
                <div className="admin-comic-lock-history__header">
                  <div>
                    <strong>{formatHistoryDate(snapshot.createdAt)}</strong>
                    <span>{snapshot.note || "旧版本"}</span>
                  </div>
                  <form action={restoreComicSceneLockAction}>
                    <input type="hidden" name="id" value={scene.id} />
                    <input type="hidden" name="snapshotId" value={snapshot.id} />
                    <button type="submit" className="button button--secondary">
                      回溯到这一版
                    </button>
                  </form>
                </div>
                <details>
                  <summary>查看旧锁定内容</summary>
                  <div className="admin-comic-lock-grid">
                    <div className="admin-comic-lock-block">
                      <h3>场景摘要</h3>
                      <pre>{snapshot.summary}</pre>
                    </div>
                    <div className="admin-comic-lock-block">
                      <h3>视觉锁定</h3>
                      <pre>{snapshot.visualNotes}</pre>
                    </div>
                    <div className="admin-comic-lock-block">
                      <h3>气氛锁定</h3>
                      <pre>{snapshot.moodNotes}</pre>
                    </div>
                    <div className="admin-comic-lock-block">
                      <h3>参考图使用规则</h3>
                      <pre>{snapshot.referenceNotes || "暂无参考图使用规则。"}</pre>
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className="form-note">还没有旧版本。手动保存或根据意见更新后，会自动保留更新前的 5 个版本。</p>
        )}
      </section>

      <section className="admin-form">
        <h2>基础资料</h2>
        <form action={updateComicSceneAction}>
          <input type="hidden" name="id" value={scene.id} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-scene-name">场景名称</label>
              <input id="comic-scene-name" name="name" defaultValue={scene.name} required />
            </div>
            <div className="field">
              <label htmlFor="comic-scene-slug">Slug</label>
              <input id="comic-scene-slug" name="slug" defaultValue={scene.slug} required />
            </div>
            <div className="field">
              <label htmlFor="comic-scene-sort-order">排序</label>
              <input
                id="comic-scene-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={scene.sortOrder}
              />
            </div>
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="active" defaultChecked={scene.active} />
            启用于 Prompt 生成
          </label>

          <div className="field">
            <label htmlFor="comic-scene-summary">场景摘要</label>
            <textarea id="comic-scene-summary" name="summary" rows={5} defaultValue={scene.summary} />
          </div>

          <div className="field">
            <label htmlFor="comic-scene-visual-notes">视觉锁定</label>
            <textarea
              id="comic-scene-visual-notes"
              name="visualNotes"
              rows={7}
              defaultValue={scene.visualNotes}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-scene-mood-notes">气氛锁定</label>
            <textarea
              id="comic-scene-mood-notes"
              name="moodNotes"
              rows={6}
              defaultValue={scene.moodNotes}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-scene-reference-notes">参考图使用规则</label>
            <textarea
              id="comic-scene-reference-notes"
              name="referenceNotes"
              rows={4}
              defaultValue={scene.referenceNotes || ""}
            />
          </div>

          <div className="stack-row">
            <span className="pill">{scene.referenceFolder}</span>
          </div>

          <button type="submit" className="button button--primary">
            保存场景
          </button>
        </form>
      </section>
      </div>
    </ComicImageTaskQueueProvider>
  );
}
