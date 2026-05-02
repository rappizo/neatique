import Link from "next/link";
import Image from "next/image";
import { getComicCharacters, getComicProject } from "@/lib/comic-queries";
import { getComicCharacterReferenceFiles } from "@/lib/comic-reference-manifest";
import { toComicReferenceMediaUrl } from "@/lib/comic-reference-images";

type AdminComicCharactersPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  created: "角色已创建。",
  saved: "角色已更新。",
  "missing-fields": "请先填写必填的角色字段。",
  "missing-character": "没有找到这个角色。"
};

export default async function AdminComicCharactersPage({
  searchParams
}: AdminComicCharactersPageProps) {
  const [project, characters, params] = await Promise.all([
    getComicProject(),
    getComicCharacters(),
    searchParams
  ]);

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          返回漫画后台
        </Link>
        <Link href="/admin/comic/characters/new" className="button button--primary">
          新增角色
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">漫画 / 角色</p>
        <h1>先锁定角色，再生成稳定的漫画 Prompts。</h1>
        <p>
          每个角色都保存固定外观、性格、说话方式和参考图。后续生成 Episode 页面时，会同时读取这些锁定内容和角色图片。
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Comic action completed: ${params.status}.`}
        </p>
      ) : null}

      {!project ? (
        <p className="notice notice--warning">
          建议先保存漫画总设定。现在新增角色也会自动创建默认项目，但先写好总设定会让角色更稳。
        </p>
      ) : null}

      <div className="admin-product-grid">
        {characters.map((character) => {
          const references = getComicCharacterReferenceFiles(character.slug);

          return (
            <article key={character.id} className="admin-product-card">
              <div className="admin-product-card__body">
                <div className="product-card__meta">
                  <span>{character.role}</span>
                  <span>{character.active ? "启用" : "停用"}</span>
                  <span>{character.slug}</span>
                </div>
                <h3>{character.name}</h3>
                <p>{character.personality}</p>
                {references.length > 0 ? (
                  <div className="admin-comic-reference-strip" aria-label={`${character.name} 参考图`}>
                    {references.slice(0, 4).map((reference) => (
                      <Image
                        key={reference.relativePath}
                        src={toComicReferenceMediaUrl(reference.relativePath)}
                        alt={`${character.name} ${reference.label}`}
                        width={96}
                        height={96}
                      />
                    ))}
                    {references.length > 4 ? <span>+{references.length - 4}</span> : null}
                  </div>
                ) : (
                  <p className="form-note">还没有上传角色图。</p>
                )}
                <div className="stack-row">
                  <span className="pill">{character.referenceFolder}</span>
                </div>
                <div className="stack-row">
                  <Link href={`/admin/comic/characters/${character.id}`} className="button button--primary">
                    编辑角色
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {characters.length === 0 ? (
        <section className="admin-form">
          <h2>还没有角色</h2>
          <p className="form-note">
            先新增第一个角色，然后可以直接在页面上传稳定的角色参考图。
          </p>
        </section>
      ) : null}
    </div>
  );
}
