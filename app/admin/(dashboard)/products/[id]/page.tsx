import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProductAction, updateProductAction } from "@/app/admin/actions";
import { ProductEditorForm } from "@/components/admin/product-editor-form";
import { getProductById } from "@/lib/queries";

type AdminProductDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminProductDetailPage({
  params,
  searchParams
}: AdminProductDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/products" className="button button--secondary">
          Back to products
        </Link>
      </div>

      {query.status ? <p className="notice">Product action completed: {query.status}.</p> : null}

      <ProductEditorForm action={updateProductAction} mode="edit" product={product} />

      <section className="admin-form">
        <h2>Delete product</h2>
        <p>This permanently removes the product from the storefront and admin listing.</p>
        <form action={deleteProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <button type="submit" className="button button--ghost">
            Delete {product.name}
          </button>
        </form>
      </section>
    </div>
  );
}
