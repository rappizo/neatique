import Image from "next/image";
import Link from "next/link";
import {
  generateComicProductLockImageAction,
  resetComicProductLockDefaultsAction,
  syncComicProductLocksAction,
  updateComicProductLockAction
} from "@/app/admin/comic-product-lock-actions";
import { getComicProductLocksPage } from "@/lib/comic-queries";
import { formatDate } from "@/lib/format";

type AdminComicProductLocksPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_MESSAGES: Record<string, string> = {
  "product-locks-synced-created": "Product locks synced. New locks were created from active products.",
  "product-locks-synced": "Product locks synced.",
  "product-locks-already-current": "Product locks are already current.",
  "product-lock-saved": "Product lock saved.",
  "product-lock-reset": "Product lock reset from the storefront product.",
  "product-lock-image-generated": "Product lock comic reference image generated.",
  "product-lock-image-failed": "Product lock comic reference image generation failed.",
  "missing-product-lock": "That product lock could not be found.",
  "missing-product-lock-fields": "Display name, short code, visual notes, and usage notes are required."
};

export default async function AdminComicProductLocksPage({
  searchParams
}: AdminComicProductLocksPageProps) {
  const [pageData, params] = await Promise.all([getComicProductLocksPage(), searchParams]);
  const activeLockCount = pageData.locks.filter((lock) => lock.active).length;
  const lockedProductIds = new Set(pageData.locks.map((lock) => lock.productId));
  const unsyncedProductCount = pageData.activeProducts.filter(
    (product) => !lockedProductIds.has(product.id)
  ).length;

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/comic" className="button button--secondary">
          Back to comic
        </Link>
        <Link href="/admin/comic/extra-story-outline" className="button button--ghost">
          Extra-Story Outline
        </Link>
        <Link href="/admin/comic/extra-story-publish-center" className="button button--ghost">
          Extra-Story Publish Center
        </Link>
      </div>

      <div className="admin-page__header">
        <p className="eyebrow">Comic / Product Locks</p>
        <h1>Product locks for extra-story comics.</h1>
        <p>
          Sync active storefront products into short comic-safe product designs, then generate a
          concrete manga reference image for each lock. Relevant product references are attached to
          extra-story page generation so products stay recognizable without copying storefront copy.
        </p>
      </div>

      {params.status ? (
        <p className="notice">
          {STATUS_MESSAGES[params.status] || `Product lock action completed: ${params.status}.`}
        </p>
      ) : null}

      <div className="cards-3">
        <section className="admin-card">
          <p className="eyebrow">Storefront products</p>
          <h3>{pageData.activeProducts.length}</h3>
          <p>Active products available for comic locking.</p>
        </section>
        <section className="admin-card">
          <p className="eyebrow">Active locks</p>
          <h3>{activeLockCount}</h3>
          <p>Product designs currently available to extra-story prompts.</p>
        </section>
        <section className="admin-card">
          <p className="eyebrow">Need sync</p>
          <h3>{unsyncedProductCount}</h3>
          <p>Active products without a product lock yet.</p>
        </section>
      </div>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Sync product locks</h2>
            <p className="form-note">
              New active products become simple manga bottle designs with a large front code such
              as SE96. Existing edited locks keep their custom notes.
            </p>
          </div>
          <form action={syncComicProductLocksAction}>
            <button type="submit" className="button button--primary">
              Sync active products
            </button>
          </form>
        </div>
      </section>

      {pageData.locks.length > 0 ? (
        <div className="admin-comic-publish-stack">
          {pageData.locks.map((lock) => (
            <section key={lock.id} id={`lock-${lock.id}`} className="admin-form">
              <div className="admin-review-pagination">
                <div className="admin-table__cell-stack">
                  <p className="eyebrow">{lock.productStatus} product</p>
                  <h2>{lock.displayName}</h2>
                  <span className="form-note">
                    /shop/{lock.productSlug} / updated {formatDate(lock.updatedAt)}
                  </span>
                </div>
                {lock.productImageUrl ? (
                  <Image
                    src={lock.productImageUrl}
                    alt={lock.displayName}
                    width={96}
                    height={96}
                    unoptimized
                  />
                ) : null}
              </div>

              <div className="cards-2">
                <section className="admin-card">
                  <p className="eyebrow">Storefront source</p>
                  {lock.productImageUrl ? (
                    <Image
                      src={lock.productImageUrl}
                      alt={lock.productName || lock.displayName}
                      width={180}
                      height={180}
                      unoptimized
                    />
                  ) : (
                    <p className="form-note">No storefront product image stored.</p>
                  )}
                </section>
                <section className="admin-card">
                  <p className="eyebrow">Comic reference lock</p>
                  {lock.imageUrl ? (
                    <>
                      <Image
                        src={lock.imageUrl}
                        alt={`${lock.displayName} comic product lock`}
                        width={180}
                        height={180}
                        unoptimized
                      />
                      <p className="form-note">
                        Generated {lock.imageGeneratedAt ? formatDate(lock.imageGeneratedAt) : "recently"}.
                      </p>
                    </>
                  ) : (
                    <p className="form-note">
                      Generate a concrete manga bottle reference before using this product in an
                      extra-story page.
                    </p>
                  )}
                </section>
              </div>

              <form action={updateComicProductLockAction} className="admin-comic-copy-grid">
                <input type="hidden" name="id" value={lock.id} />
                <div className="field">
                  <label htmlFor={`displayName-${lock.id}`}>Display name</label>
                  <input
                    id={`displayName-${lock.id}`}
                    name="displayName"
                    defaultValue={lock.displayName}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`shortCode-${lock.id}`}>Bottle code</label>
                  <input
                    id={`shortCode-${lock.id}`}
                    name="shortCode"
                    defaultValue={lock.shortCode}
                    maxLength={12}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`sortOrder-${lock.id}`}>Sort order</label>
                  <input
                    id={`sortOrder-${lock.id}`}
                    name="sortOrder"
                    type="number"
                    min={0}
                    defaultValue={lock.sortOrder}
                  />
                </div>
                <label className="field field--checkbox">
                  <input type="checkbox" name="active" defaultChecked={lock.active} />
                  Active in comic prompts
                </label>
                <div className="field">
                  <label htmlFor={`visualNotes-${lock.id}`}>Visual lock</label>
                  <textarea
                    id={`visualNotes-${lock.id}`}
                    name="visualNotes"
                    rows={6}
                    defaultValue={lock.visualNotes}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`usageNotes-${lock.id}`}>Usage lock</label>
                  <textarea
                    id={`usageNotes-${lock.id}`}
                    name="usageNotes"
                    rows={6}
                    defaultValue={lock.usageNotes}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`referenceNotes-${lock.id}`}>Storefront note</label>
                  <textarea
                    id={`referenceNotes-${lock.id}`}
                    name="referenceNotes"
                    rows={4}
                    defaultValue={lock.referenceNotes || ""}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`imagePrompt-${lock.id}`}>Comic reference image prompt</label>
                  <textarea
                    id={`imagePrompt-${lock.id}`}
                    name="imagePrompt"
                    rows={6}
                    defaultValue={lock.imagePrompt || ""}
                    placeholder="Leave empty to use the default comic product reference prompt."
                  />
                </div>
                <div className="stack-row">
                  <button type="submit" className="button button--primary">
                    Save lock
                  </button>
                  <button
                    type="submit"
                    formAction={generateComicProductLockImageAction}
                    className="button button--secondary"
                  >
                    Generate comic reference
                  </button>
                  <button
                    type="submit"
                    form={`reset-product-lock-${lock.id}`}
                    className="button button--ghost"
                  >
                    Reset default
                  </button>
                </div>
              </form>
              <form id={`reset-product-lock-${lock.id}`} action={resetComicProductLockDefaultsAction}>
                <input type="hidden" name="id" value={lock.id} />
              </form>
            </section>
          ))}
        </div>
      ) : (
        <section className="admin-form">
          <h2>No product locks yet</h2>
          <p className="form-note">Sync active products to create the first comic product locks.</p>
        </section>
      )}
    </div>
  );
}
