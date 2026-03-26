import Image from "next/image";
import type { ProductRecord } from "@/lib/types";
import { formatCurrency, formatCurrencyInput, getSavingsCents } from "@/lib/format";

type ProductEditorFormProps = {
  action: (formData: FormData) => Promise<void>;
  mode: "create" | "edit";
  product?: ProductRecord | null;
};

export function ProductEditorForm({ action, mode, product }: ProductEditorFormProps) {
  const savingsCents = product
    ? getSavingsCents(product.compareAtPriceCents, product.priceCents)
    : 0;

  return (
    <section className="admin-form admin-product-editor">
      <div className="admin-product-editor__header">
        <div className="admin-page__header">
          <p className="eyebrow">{mode === "create" ? "New Product" : "Edit Product"}</p>
          <h1>{mode === "create" ? "Create a new catalog item." : `Update ${product?.name}.`}</h1>
          <p>
            Set the main image, gallery images, inventory, and sale pricing here. The storefront
            will use the sale price as the live selling price and show the original price above it.
          </p>
        </div>

        {product ? (
          <article className="admin-product-card admin-product-card--preview">
            <div className="admin-product-card__media">
              <Image src={product.imageUrl} alt={product.name} width={420} height={420} />
            </div>
            <div className="admin-product-card__body">
              <p className="eyebrow">{product.category}</p>
              <h3>{product.name}</h3>
              <p>{product.shortDescription}</p>
              <div className="product-price-stack">
                {product.compareAtPriceCents ? (
                  <span className="product-price-stack__original">
                    {formatCurrency(product.compareAtPriceCents, product.currency)}
                  </span>
                ) : null}
                <strong className="product-price-stack__sale">
                  {formatCurrency(product.priceCents, product.currency)}
                </strong>
                {savingsCents > 0 ? (
                  <span className="product-price-stack__off">
                    {formatCurrency(savingsCents, product.currency)} Off
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        ) : null}
      </div>

      <form action={action}>
        {product ? <input type="hidden" name="id" value={product.id} /> : null}

        <div className="admin-form__grid">
          <div className="field">
            <label htmlFor="name">Product name</label>
            <input id="name" name="name" defaultValue={product?.name ?? ""} required />
          </div>
          <div className="field">
            <label htmlFor="slug">Slug</label>
            <input id="slug" name="slug" defaultValue={product?.slug ?? ""} required />
          </div>
          <div className="field">
            <label htmlFor="tagline">Tagline</label>
            <input id="tagline" name="tagline" defaultValue={product?.tagline ?? ""} required />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <input id="category" name="category" defaultValue={product?.category ?? ""} required />
          </div>
          <div className="field">
            <label htmlFor="priceCents">Sale price</label>
            <input
              id="priceCents"
              name="priceCents"
              type="number"
              min="0"
              step="0.01"
              defaultValue={formatCurrencyInput(product?.priceCents)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="compareAtPriceCents">Original price</label>
            <input
              id="compareAtPriceCents"
              name="compareAtPriceCents"
              type="number"
              min="0"
              step="0.01"
              defaultValue={formatCurrencyInput(product?.compareAtPriceCents)}
            />
          </div>
          <div className="field">
            <label htmlFor="inventory">Inventory</label>
            <input
              id="inventory"
              name="inventory"
              type="number"
              defaultValue={product?.inventory ?? 0}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pointsReward">Reward points</label>
            <input
              id="pointsReward"
              name="pointsReward"
              type="number"
              defaultValue={product?.pointsReward ?? 0}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="imageUrl">Main image URL</label>
            <input
              id="imageUrl"
              name="imageUrl"
              defaultValue={product?.imageUrl ?? ""}
              placeholder="/media/product/folder/0.png"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="stripePriceId">Stripe price ID</label>
            <input
              id="stripePriceId"
              name="stripePriceId"
              defaultValue={product?.stripePriceId ?? ""}
              placeholder="Optional"
            />
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={product?.status ?? "DRAFT"}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <label className="field field--checkbox">
            <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} />
            Feature on homepage
          </label>
        </div>

        <div className="field">
          <label htmlFor="shortDescription">Short description</label>
          <textarea
            id="shortDescription"
            name="shortDescription"
            defaultValue={product?.shortDescription ?? ""}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="description">Product description</label>
          <textarea id="description" name="description" defaultValue={product?.description ?? ""} required />
        </div>

        <div className="field">
          <label htmlFor="details">Detail bullets</label>
          <textarea id="details" name="details" defaultValue={product?.details ?? ""} required />
        </div>

        <div className="field">
          <label htmlFor="galleryImages">Gallery image URLs</label>
          <textarea
            id="galleryImages"
            name="galleryImages"
            defaultValue={product?.galleryImages.join("\n") ?? ""}
            placeholder={"/media/product/folder/0.png\n/media/product/folder/1.png"}
          />
          <p className="form-note">Add one image URL per line. The first line can match the main image.</p>
        </div>

        <div className="stack-row">
          <button type="submit" className="button button--primary">
            {mode === "create" ? "Create product" : "Save product"}
          </button>
        </div>
      </form>

      {product?.galleryImages.length ? (
        <div className="admin-product-editor__gallery">
          {product.galleryImages.map((imageUrl, index) => (
            <div key={`${product.id}-${imageUrl}`} className="admin-product-editor__thumb">
              <Image src={imageUrl} alt={`${product.name} ${index + 1}`} width={180} height={180} />
              <span>{index === 0 ? "Main" : `Image ${index + 1}`}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
