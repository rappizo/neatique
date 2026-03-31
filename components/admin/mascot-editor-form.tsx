import Image from "next/image";
import type { MascotRewardRecord } from "@/lib/types";

type MascotEditorFormProps = {
  action: (formData: FormData) => Promise<void>;
  mode: "create" | "edit";
  mascot?: MascotRewardRecord | null;
};

export function MascotEditorForm({ action, mode, mascot }: MascotEditorFormProps) {
  return (
    <section className="admin-form admin-product-editor">
      <div className="admin-product-editor__header">
        <div className="admin-page__header">
          <p className="eyebrow">{mode === "create" ? "New Mascot" : "Edit Mascot"}</p>
          <h1>{mode === "create" ? "Create a redeemable mascot." : `Update ${mascot?.name}.`}</h1>
          <p>
            Set the SKU, title, image, points cost, and active state here. Customers can redeem
            active mascots on `/rd` once they have enough points.
          </p>
        </div>

        {mascot ? (
          <article className="admin-product-card admin-product-card--preview">
            <div className="admin-product-card__media">
              <Image src={mascot.imageUrl} alt={mascot.name} width={420} height={420} unoptimized />
            </div>
            <div className="admin-product-card__body">
              <p className="eyebrow">Mascot reward</p>
              <p className="form-note">SKU {mascot.sku}</p>
              <p className="form-note">{mascot.active ? "Active for redemption" : "Inactive"}</p>
              <h3>{mascot.name}</h3>
              <p>{mascot.description || "No description yet."}</p>
              <div className="page-hero__stats">
                <span className="pill">{mascot.pointsCost} points</span>
                <span className="pill">{mascot.redemptionCount ?? 0} redemptions</span>
              </div>
            </div>
          </article>
        ) : null}
      </div>

      <form action={action}>
        {mascot ? <input type="hidden" name="id" value={mascot.id} /> : null}

        <div className="admin-form__grid">
          <div className="field">
            <label htmlFor="sku">SKU</label>
            <input id="sku" name="sku" defaultValue={mascot?.sku ?? ""} required />
          </div>
          <div className="field">
            <label htmlFor="name">Mascot name</label>
            <input id="name" name="name" defaultValue={mascot?.name ?? ""} required />
          </div>
          <div className="field">
            <label htmlFor="slug">Slug</label>
            <input id="slug" name="slug" defaultValue={mascot?.slug ?? ""} required />
          </div>
          <div className="field">
            <label htmlFor="pointsCost">Points cost</label>
            <input
              id="pointsCost"
              name="pointsCost"
              type="number"
              min="1"
              defaultValue={mascot?.pointsCost ?? 1000}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="sortOrder">Sort order</label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min="0"
              defaultValue={mascot?.sortOrder ?? 0}
            />
          </div>
          <label className="field field--checkbox">
            <input type="checkbox" name="active" defaultChecked={mascot?.active ?? true} />
            Active for redemption
          </label>
        </div>

        <div className="field">
          <label htmlFor="imageUrl">Image URL</label>
          <input
            id="imageUrl"
            name="imageUrl"
            defaultValue={mascot?.imageUrl ?? ""}
            placeholder="/media/site/mascots/your-file.png"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" defaultValue={mascot?.description ?? ""} />
        </div>

        <div className="stack-row">
          <button type="submit" className="button button--primary">
            {mode === "create" ? "Create mascot" : "Save mascot"}
          </button>
        </div>
      </form>
    </section>
  );
}
