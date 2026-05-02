import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  restoreComicCharacterLockAction,
  reviseComicCharacterLockAction,
  updateComicCharacterAction,
  uploadComicCharacterReferenceAction
} from "@/app/admin/comic-editor-actions";
import { getComicCharacterById } from "@/lib/comic-queries";
import { getComicCharacterLockHistory } from "@/lib/comic-lock-history";
import { getComicCharacterReferenceFiles } from "@/lib/comic-reference-manifest";
import { toComicReferenceMediaUrl } from "@/lib/comic-reference-images";

type AdminComicCharacterDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "角色已创建。",
  saved: "角色已更新。",
  "missing-fields": "请先填写必填的角色字段。",
  "reference-uploaded": "角色参考图已上传。",
  "missing-reference-upload": "请选择一张要上传的角色参考图。",
  "reference-upload-too-large": "参考图不能超过 20 MB。",
  "reference-upload-type": "参考图必须是 PNG、JPG、JPEG 或 WEBP。",
  "reference-upload-failed": "参考图上传失败，请稍后再试。",
  "lock-revised": "角色锁定内容已根据修改意见更新。",
  "lock-revision-missing": "请先输入修改意见。",
  "lock-revision-failed": "角色锁定内容更新失败，请检查 OpenAI 配置或稍后再试。",
  "lock-restored": "角色锁定内容已回溯到旧版本。",
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

export default async function AdminComicCharacterDetailPage({
  params,
  searchParams
}: AdminComicCharacterDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const character = await getComicCharacterById(id);

  if (!character) {
    notFound();
  }

  const [referenceFiles, lockHistory] = await Promise.all([
    Promise.resolve(getComicCharacterReferenceFiles(character.slug)),
    getComicCharacterLockHistory(character.id)
  ]);

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic/characters" className="button button--secondary">
          返回角色列表
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">漫画 / 角色</p>
        <h1>编辑 {character.name}</h1>
        <p>
          这里是角色身份锁定区。后续生成 Prompt 和页面图时，会同时读取锁定内容和上传的角色参考图。
        </p>
      </div>

      {query.status ? (
        <p className="notice">
          {STATUS_MESSAGES[query.status] || `漫画操作已完成：${query.status}。`}
        </p>
      ) : null}

      <section className="admin-form" id="references">
        <h2>角色参考图</h2>
        <p className="form-note">
          上传角色模型图、表情表、侧面图或服装图。填写同名文件时会覆盖旧图，适合修改主参考图。
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
                  alt={`${character.name} ${reference.label}`}
                  width={240}
                  height={240}
                />
                <span>{reference.label}</span>
                <small>{reference.fileName}</small>
              </a>
            ))}
          </div>
        ) : (
          <p className="notice notice--warning">还没有上传角色图。生成页面时会更依赖文字锁定。</p>
        )}

        <form action={uploadComicCharacterReferenceAction}>
          <input type="hidden" name="id" value={character.id} />
          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-character-reference-image">本地图片</label>
              <input
                id="comic-character-reference-image"
                name="referenceImage"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="comic-character-reference-label">显示名称</label>
              <input
                id="comic-character-reference-label"
                name="label"
                placeholder="例如：主模型图 / 表情表"
              />
            </div>
            <div className="field">
              <label htmlFor="comic-character-reference-filename">保存为文件名</label>
              <input
                id="comic-character-reference-filename"
                name="fileName"
                placeholder="留空使用原文件名；同名会覆盖"
              />
            </div>
          </div>
          <button type="submit" className="button button--primary">
            上传或覆盖角色图
          </button>
        </form>
      </section>

      <section className="admin-form" id="lock">
        <h2>角色锁定内容</h2>
        <p className="form-note">
          这部分会作为 MD 风格的角色资料参与后续 Prompt 和图片生成。角色名保持英文，内容可以中文描述。
        </p>
        <div className="admin-comic-lock-grid">
          <div className="admin-comic-lock-block">
            <h3>定位</h3>
            <pre>{character.role}</pre>
          </div>
          <div className="admin-comic-lock-block">
            <h3>外观锁定</h3>
            <pre>{character.appearance}</pre>
          </div>
          <div className="admin-comic-lock-block">
            <h3>性格锁定</h3>
            <pre>{character.personality}</pre>
          </div>
          <div className="admin-comic-lock-block">
            <h3>说话方式</h3>
            <pre>{character.speechGuide}</pre>
          </div>
          <div className="admin-comic-lock-block admin-comic-lock-block--wide">
            <h3>参考图使用规则</h3>
            <pre>{character.referenceNotes || "暂无参考图使用规则。"}</pre>
          </div>
        </div>

        <form action={reviseComicCharacterLockAction}>
          <input type="hidden" name="id" value={character.id} />
          <div className="field">
            <label htmlFor="comic-character-lock-revision">修改意见</label>
            <textarea
              id="comic-character-lock-revision"
              name="revisionInstruction"
              rows={5}
              placeholder="例如：把 Muci 和 Sunny Spritz 的轮廓区别写得更明确，强调 Muci 是水滴形、Sunny 是柔软五角星。"
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
                  <form action={restoreComicCharacterLockAction}>
                    <input type="hidden" name="id" value={character.id} />
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
                      <h3>定位</h3>
                      <pre>{snapshot.role}</pre>
                    </div>
                    <div className="admin-comic-lock-block">
                      <h3>外观锁定</h3>
                      <pre>{snapshot.appearance}</pre>
                    </div>
                    <div className="admin-comic-lock-block">
                      <h3>性格锁定</h3>
                      <pre>{snapshot.personality}</pre>
                    </div>
                    <div className="admin-comic-lock-block">
                      <h3>说话方式</h3>
                      <pre>{snapshot.speechGuide}</pre>
                    </div>
                    <div className="admin-comic-lock-block admin-comic-lock-block--wide">
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
        <form action={updateComicCharacterAction}>
          <input type="hidden" name="id" value={character.id} />

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="comic-character-name">角色名</label>
              <input id="comic-character-name" name="name" defaultValue={character.name} required />
            </div>
            <div className="field">
              <label htmlFor="comic-character-slug">Slug</label>
              <input id="comic-character-slug" name="slug" defaultValue={character.slug} required />
            </div>
            <div className="field">
              <label htmlFor="comic-character-role">定位</label>
              <input id="comic-character-role" name="role" defaultValue={character.role} />
            </div>
            <div className="field">
              <label htmlFor="comic-character-sort-order">排序</label>
              <input
                id="comic-character-sort-order"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={character.sortOrder}
              />
            </div>
          </div>

          <label className="field field--checkbox">
            <input type="checkbox" name="active" defaultChecked={character.active} />
            启用于 Prompt 生成
          </label>

          <div className="field">
            <label htmlFor="comic-character-appearance">固定外观</label>
            <textarea
              id="comic-character-appearance"
              name="appearance"
              rows={8}
              defaultValue={character.appearance}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-character-personality">性格</label>
            <textarea
              id="comic-character-personality"
              name="personality"
              rows={8}
              defaultValue={character.personality}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-character-speech-guide">说话方式</label>
            <textarea
              id="comic-character-speech-guide"
              name="speechGuide"
              rows={6}
              defaultValue={character.speechGuide}
            />
          </div>

          <div className="field">
            <label htmlFor="comic-character-reference-notes">参考图使用规则</label>
            <textarea
              id="comic-character-reference-notes"
              name="referenceNotes"
              rows={4}
              defaultValue={character.referenceNotes || ""}
            />
          </div>

          <div className="stack-row">
            <span className="pill">{character.referenceFolder}</span>
          </div>

          <button type="submit" className="button button--primary">
            保存角色
          </button>
        </form>
      </section>
    </div>
  );
}
