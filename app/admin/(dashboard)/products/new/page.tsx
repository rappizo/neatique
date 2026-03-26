import Link from "next/link";
import { createProductAction } from "@/app/admin/actions";
import { ProductEditorForm } from "@/components/admin/product-editor-form";

export default function AdminNewProductPage() {
  return (
    <div className="admin-page">
      <div className="stack-row">
        <Link href="/admin/products" className="button button--secondary">
          Back to products
        </Link>
      </div>
      <ProductEditorForm action={createProductAction} mode="create" />
    </div>
  );
}
