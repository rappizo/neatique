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
              <Image src={product.imageUrl} alt={product.name} width={420} height={420} unoptimized />
            </div>
            <div className="admin-product-card__body">
              <p className="eyebrow">{product.category}</p>
              <p className="form-note">Product ID {product.productCode || "Pending assignment"}</p>
              <p className="form-note">
                Product Short Name {product.productShortName || "Not set"} / Amazon ASIN{" "}
                {product.amazonAsin || "Not set"}
              </p>
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
            <label htmlFor="productCode">Product ID</label>
            <input
              id="productCode"
              value={product?.productCode || "Auto-generated after creation"}
              readOnly
              disabled
            />
          </div>
          <div className="field">
            <label htmlFor="name">Product name</label>
            <input id="name" name="name" defaultValue={product?.name ?? ""} required />
          </div>
          <div className="field">
            <label htmlFor="productShortName">Product Short Name</label>
            <input
              id="productShortName"
              name="productShortName"
              defaultValue={product?.productShortName ?? ""}
              placeholder="Used in the OMB purchase selector"
            />
          </div>
          <div className="field">
            <label htmlFor="amazonAsin">Amazon ASIN</label>
            <input
              id="amazonAsin"
              name="amazonAsin"
              defaultValue={product?.amazonAsin ?? ""}
              placeholder="Used for Amazon product and review links"
            />
          </div>
          <div className="field">
            <label htmlFor="gtin">GTIN / UPC / EAN</label>
            <input
              id="gtin"
              name="gtin"
              inputMode="numeric"
              defaultValue={product?.gtin ?? ""}
              placeholder="Manufacturer-assigned barcode only"
            />
          </div>
          <div className="field">
            <label htmlFor="mpn">Manufacturer part number</label>
            <input
              id="mpn"
              value={product?.productCode || "Auto-generated with Product ID"}
              readOnly
              disabled
            />
            <p className="form-note">Neatique SKU and official manufacturer MPN are identical.</p>
          </div>
          <div className="field">
            <label>Manufacturer identifier status</label>
            <input value="Verified — SKU is the official MPN" readOnly disabled />
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
            <label htmlFor="priceValidUntil">Sale price valid until</label>
            <input
              id="priceValidUntil"
              name="priceValidUntil"
              type="date"
              defaultValue={product?.priceValidUntil?.toISOString().slice(0, 10) ?? ""}
            />
            <p className="form-note">
              Enter only the real advertised-price end date. Leave blank to omit priceValidUntil.
            </p>
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

        <div className="admin-form__grid">
          <div className="field">
            <label htmlFor="netContent">Net content</label>
            <input
              id="netContent"
              name="netContent"
              defaultValue={product?.netContent ?? ""}
              placeholder="Example: 1.69 fl oz / 50 mL"
            />
          </div>
          <div className="field">
            <label htmlFor="countryOfOrigin">Country of origin</label>
            <input
              id="countryOfOrigin"
              value="Made in PRC (CN)"
              readOnly
              disabled
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="keyIngredientDetails">Verified key ingredients and concentrations</label>
          <textarea
            id="keyIngredientDetails"
            name="keyIngredientDetails"
            defaultValue={product?.keyIngredientDetails ?? ""}
            placeholder="One verified ingredient or concentration per line. State 'concentration not provided' instead of guessing."
          />
        </div>

        <div className="field">
          <label htmlFor="pdrnSource">PDRN source and type</label>
          <input
            id="pdrnSource"
            name="pdrnSource"
            defaultValue={product?.pdrnSource ?? ""}
            placeholder="Only enter a source confirmed by manufacturing documentation"
          />
        </div>

        <div className="admin-form__grid">
          <div className="field">
            <label htmlFor="suitableFor">Suitable for</label>
            <textarea
              id="suitableFor"
              name="suitableFor"
              defaultValue={product?.suitableFor ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="cautionFor">Not suitable for / use caution</label>
            <textarea
              id="cautionFor"
              name="cautionFor"
              defaultValue={product?.cautionFor ?? ""}
              placeholder="Add only verified restrictions or packaging warnings"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="batchExpiryInfo">Batch and shelf-life information</label>
          <textarea
            id="batchExpiryInfo"
            name="batchExpiryInfo"
            defaultValue={product?.batchExpiryInfo ?? ""}
            placeholder="Explain where the customer can find lot, expiration or period-after-opening information"
          />
        </div>

        <div className="field">
          <label htmlFor="textureVideoUrl">Texture / application video URL</label>
          <input
            id="textureVideoUrl"
            name="textureVideoUrl"
            type="url"
            defaultValue={product?.textureVideoUrl ?? ""}
            placeholder="Direct HTTPS MP4 or WebM URL"
          />
        </div>

        <div className="field">
          <label htmlFor="ingredients">Full INCI ingredients</label>
          <textarea
            id="ingredients"
            name="ingredients"
            defaultValue={product?.ingredients ?? ""}
            placeholder="Enter the complete packaging INCI list; do not enter only hero ingredients."
          />
        </div>

        <div className="field">
          <label htmlFor="directions">Directions</label>
          <textarea id="directions" name="directions" defaultValue={product?.directions ?? ""} />
        </div>

        <div className="field">
          <label htmlFor="warnings">Warnings and precautions</label>
          <textarea id="warnings" name="warnings" defaultValue={product?.warnings ?? ""} />
        </div>

        <div className="field">
          <label htmlFor="seoTitle">SEO title override</label>
          <input
            id="seoTitle"
            name="seoTitle"
            defaultValue={product?.seoTitle ?? ""}
            maxLength={70}
            placeholder="Leave blank to use the verified product SEO map"
          />
        </div>

        <div className="field">
          <label htmlFor="seoDescription">SEO description override</label>
          <textarea
            id="seoDescription"
            name="seoDescription"
            defaultValue={product?.seoDescription ?? ""}
            maxLength={180}
            placeholder="Leave blank to use the verified product SEO map"
          />
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
              <Image src={imageUrl} alt={`${product.name} ${index + 1}`} width={180} height={180} unoptimized />
              <span>{index === 0 ? "Main" : `Image ${index + 1}`}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
