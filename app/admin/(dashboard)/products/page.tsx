import Image from "next/image";
import Link from "next/link";
import { formatCurrency, getSavingsCents } from "@/lib/format";
import { getProducts } from "@/lib/queries";

type AdminProductsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const [products, params] = await Promise.all([getProducts(), searchParams]);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Products</p>
        <h1>Manage the Neatique product catalog.</h1>
        <p>
          Open any card to edit the main image, gallery images, pricing, inventory, and product
          copy.
        </p>
      </div>

      {params.status ? <p className="notice">Product action completed: {params.status}.</p> : null}

      <div className="stack-row">
        <Link href="/admin/products/new" className="button button--primary">
          Create product
        </Link>
      </div>

      <div className="admin-product-grid">
        {products.map((product) => (
          <article key={product.id} className="admin-product-card">
            <div className="admin-product-card__media">
              <Image src={product.imageUrl} alt={product.name} width={420} height={420} unoptimized />
            </div>
            <div className="admin-product-card__body">
              <div className="product-card__meta">
                <span>{product.category}</span>
                <span>{product.status}</span>
                <span>ID {product.productCode || "Pending"}</span>
              </div>
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
                {getSavingsCents(product.compareAtPriceCents, product.priceCents) > 0 ? (
                  <span className="product-price-stack__off">
                    {formatCurrency(
                      getSavingsCents(product.compareAtPriceCents, product.priceCents),
                      product.currency
                    )}{" "}
                    Off
                  </span>
                ) : null}
              </div>

              <div className="product-card__meta">
                <span>{product.inventory} in stock</span>
                <span>{product.galleryImages.length || 1} images</span>
              </div>

              <div className="stack-row">
                <Link href={`/admin/products/${product.id}`} className="button button--primary">
                  Edit
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
