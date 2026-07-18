import { siteConfig } from "@/lib/site-config";
import { getProductSeo } from "@/lib/product-seo";
import { isValidGtin, normalizeGtin } from "@/lib/product-identifiers";
import type { ProductRecord } from "@/lib/types";

export function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function element(name: string, value: unknown) {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function absoluteUrl(value: string) {
  return new URL(value, siteConfig.url).toString();
}

function buildProductItem(product: ProductRecord) {
  const seo = getProductSeo(product);
  const url = `${siteConfig.url}/shop/${product.slug}`;
  const gtin = isValidGtin(product.gtin) ? normalizeGtin(product.gtin) : null;
  const mpn = product.productCode?.trim() || null;
  const images = Array.from(new Set(product.galleryImages.map(absoluteUrl)))
    .filter((image) => image !== absoluteUrl(product.imageUrl))
    .slice(0, 10);

  return [
    "<item>",
    element("g:id", product.productCode || product.id),
    element("title", seo.title),
    element("description", seo.description),
    element("link", url),
    element("g:canonical_link", url),
    element("g:image_link", absoluteUrl(product.imageUrl)),
    ...images.map((image) => element("g:additional_image_link", image)),
    element("g:availability", product.inventory > 0 ? "in_stock" : "out_of_stock"),
    element("g:price", `${(product.priceCents / 100).toFixed(2)} ${product.currency}`),
    element("g:brand", siteConfig.name),
    element("g:condition", "new"),
    element("g:google_product_category", "Health & Beauty > Personal Care > Cosmetics > Skin Care"),
    element("g:product_type", product.category),
    product.netContent ? element("g:size", product.netContent) : "",
    gtin ? element("g:gtin", gtin) : "",
    mpn ? element("g:mpn", mpn) : "",
    !gtin && !mpn && product.identifierExists === false
      ? element("g:identifier_exists", "no")
      : "",
    "<g:shipping>",
    element("g:country", "US"),
    element("g:service", "Mainland US standard shipping"),
    element("g:price", `0.00 ${product.currency}`),
    "</g:shipping>",
    "</item>"
  ].filter(Boolean).join("");
}

export function buildGoogleMerchantFeed(products: ProductRecord[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    element("title", siteConfig.title),
    element("link", siteConfig.url),
    element("description", "Current Neatique Beauty product catalog for Google Merchant Center."),
    ...products.map(buildProductItem),
    "</channel>",
    "</rss>"
  ].join("");
}
