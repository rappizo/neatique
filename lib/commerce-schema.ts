import { siteConfig } from "@/lib/site-config";
import { CONTIGUOUS_US_STATES } from "@/lib/us-address";
import { isValidGtin, normalizeGtin } from "@/lib/product-identifiers";
import type { ProductRecord } from "@/lib/types";

export const merchantReturnPolicy = {
  "@type": "MerchantReturnPolicy",
  "@id": `${siteConfig.url}/#return-policy`,
  applicableCountry: "US",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 30,
  returnMethod: "https://schema.org/ReturnByMail",
  merchantReturnLink: `${siteConfig.url}/return-policy`
};

export const merchantShippingDetails = {
  "@type": "OfferShippingDetails",
  "@id": `${siteConfig.url}/#shipping-details`,
  shippingRate: {
    "@type": "MonetaryAmount",
    value: 0,
    currency: "USD"
  },
  shippingDestination: {
    "@type": "DefinedRegion",
    addressCountry: "US",
    addressRegion: CONTIGUOUS_US_STATES.map((state) => state.code)
  },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: {
      "@type": "QuantitativeValue",
      minValue: 0,
      maxValue: 1,
      unitCode: "DAY"
    },
    businessDays: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "https://schema.org/Monday",
        "https://schema.org/Tuesday",
        "https://schema.org/Wednesday",
        "https://schema.org/Thursday",
        "https://schema.org/Friday"
      ]
    }
  }
};

export const merchantShippingService = {
  "@type": "ShippingService",
  "@id": `${siteConfig.url}/#shipping-service`,
  name: "Free mainland U.S. shipping",
  description: "Free shipping to the contiguous United States with typical handling within one business day.",
  fulfillmentType: "https://schema.org/FulfillmentTypeDelivery",
  handlingTime: {
    "@type": "ServicePeriod",
    duration: {
      "@type": "QuantitativeValue",
      minValue: 0,
      maxValue: 1,
      unitCode: "DAY"
    },
    businessDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  },
  shippingConditions: {
    "@type": "ShippingConditions",
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "US",
      addressRegion: CONTIGUOUS_US_STATES.map((state) => state.code)
    },
    shippingRate: {
      "@type": "MonetaryAmount",
      value: 0,
      currency: "USD"
    }
  }
};

export function buildProductOfferSchema(product: ProductRecord) {
  const priceValidUntil = product.priceValidUntil;

  return {
    "@type": "Offer",
    url: `${siteConfig.url}/shop/${product.slug}`,
    priceCurrency: product.currency,
    price: (product.priceCents / 100).toFixed(2),
    availability:
      product.inventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    shippingDetails: merchantShippingDetails,
    hasMerchantReturnPolicy: { "@id": merchantReturnPolicy["@id"] },
    ...(priceValidUntil && priceValidUntil.getTime() > Date.now()
      ? { priceValidUntil: priceValidUntil.toISOString().slice(0, 10) }
      : {})
  };
}

export function buildVerifiedProductIdentifiers(product: ProductRecord) {
  const gtin = isValidGtin(product.gtin) ? normalizeGtin(product.gtin) : null;
  const mpn = product.productCode?.trim() || null;

  return {
    ...(gtin ? { gtin } : {}),
    ...(mpn ? { mpn } : {})
  };
}
