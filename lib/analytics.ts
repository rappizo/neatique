import type { ProductRecord } from "@/lib/types";

export type GoogleAnalyticsItem = {
  item_id: string;
  item_name: string;
  affiliation: string;
  item_brand: string;
  item_category: string;
  price: number;
  quantity: number;
  index?: number;
  item_list_id?: string;
  item_list_name?: string;
};

export type GoogleAnalyticsParams = Record<
  string,
  string | number | boolean | GoogleAnalyticsItem[] | undefined
>;

export function toGoogleAnalyticsItem(
  product: Pick<
    ProductRecord,
    "id" | "productCode" | "name" | "category" | "priceCents" | "currency"
  >,
  quantity = 1,
  extras: Pick<GoogleAnalyticsItem, "index" | "item_list_id" | "item_list_name"> = {}
): GoogleAnalyticsItem {
  return {
    item_id: product.productCode || product.id,
    item_name: product.name,
    affiliation: "Neatique Beauty Online Store",
    item_brand: "Neatique",
    item_category: product.category,
    price: product.priceCents / 100,
    quantity,
    ...extras
  };
}
