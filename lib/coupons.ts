import type { CouponRecord, ProductRecord } from "@/lib/types";
import { parseProductCodesInput, serializeProductCodes } from "@/lib/product-codes";

export type DiscountableCartLine = {
  product: Pick<
    ProductRecord,
    "id" | "name" | "shortDescription" | "currency" | "priceCents" | "productCode"
  >;
  quantity: number;
  lineTotalCents: number;
};

type DiscountedUnit = {
  product: DiscountableCartLine["product"];
  adjustedAmountCents: number;
};

type AppliedCoupon = Pick<
  CouponRecord,
  | "code"
  | "discountType"
  | "percentOff"
  | "amountOffCents"
  | "appliesToAll"
  | "productCodes"
  | "combinable"
>;

export function normalizeCouponCode(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

export function parseCouponCodesInput(value: string | null | undefined) {
  return Array.from(
    new Set(
      (value || "")
        .split(/[\s,;]+/)
        .map((item) => normalizeCouponCode(item))
        .filter(Boolean)
    )
  );
}

export function parseCouponScopeInput(value: string | null | undefined) {
  return parseProductCodesInput(value);
}

export function serializeCouponScope(codes: string[]) {
  return serializeProductCodes(codes);
}

export function parseStoredCouponProductCodes(value: string | null | undefined) {
  return (value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function couponAppliesToProduct(
  coupon: Pick<CouponRecord, "appliesToAll" | "productCodes">,
  productCode: string
) {
  return coupon.appliesToAll || coupon.productCodes.includes(productCode);
}

export function formatCouponValue(coupon: Pick<CouponRecord, "discountType" | "percentOff" | "amountOffCents">) {
  if (coupon.discountType === "PERCENT") {
    return `${coupon.percentOff ?? 0}% off`;
  }

  return `$${((coupon.amountOffCents ?? 0) / 100).toFixed(2)} off`;
}

export function formatCouponScopeSummary(coupon: Pick<CouponRecord, "appliesToAll" | "productCodes">) {
  if (coupon.appliesToAll) {
    return "ALL orders";
  }

  if (coupon.productCodes.length === 0) {
    return "No product IDs selected";
  }

  return coupon.productCodes.join(", ");
}

export function formatCouponCombinationSummary(coupon: Pick<CouponRecord, "combinable">) {
  return coupon.combinable ? "Can combine with other coupons" : "Must be used alone";
}

export function calculateCouponDiscount(
  coupon: Pick<
    CouponRecord,
    "discountType" | "percentOff" | "amountOffCents" | "appliesToAll" | "productCodes"
  >,
  units: Array<{ product: DiscountableCartLine["product"]; amountCents: number }>
) {
  const eligibleUnits = units.filter((unit) => couponAppliesToProduct(coupon, unit.product.productCode));
  const eligibleSubtotalCents = eligibleUnits.reduce((sum, unit) => sum + unit.amountCents, 0);

  if (eligibleSubtotalCents <= 0) {
    return {
      eligibleSubtotalCents,
      discountCents: 0
    };
  }

  const discountCents =
    coupon.discountType === "PERCENT"
      ? Math.min(
          eligibleSubtotalCents,
          Math.round(eligibleSubtotalCents * Math.max(0, Math.min(coupon.percentOff ?? 0, 100)) / 100)
        )
      : Math.min(eligibleSubtotalCents, Math.max(0, coupon.amountOffCents ?? 0));

  return {
    eligibleSubtotalCents,
    discountCents
  };
}

function distributeDiscountAcrossEligibleUnits(
  eligibleUnits: Array<{ product: DiscountableCartLine["product"]; amountCents: number }>,
  discountCents: number
) {
  if (discountCents <= 0 || eligibleUnits.length === 0) {
    return eligibleUnits.map(() => 0);
  }

  const eligibleSubtotalCents = eligibleUnits.reduce((sum, unit) => sum + unit.amountCents, 0);
  const allocations = eligibleUnits.map((unit) =>
    Math.min(
      unit.amountCents,
      Math.floor((discountCents * unit.amountCents) / eligibleSubtotalCents)
    )
  );

  let allocatedCents = allocations.reduce((sum, value) => sum + value, 0);
  let remainderCents = discountCents - allocatedCents;
  const priorityOrder = eligibleUnits
    .map((unit, index) => ({
      index,
      amountCents: unit.amountCents
    }))
    .sort((left, right) => right.amountCents - left.amountCents || left.index - right.index);

  while (remainderCents > 0) {
    let changed = false;

    for (const item of priorityOrder) {
      if (allocations[item.index] >= eligibleUnits[item.index].amountCents) {
        continue;
      }

      allocations[item.index] += 1;
      allocatedCents += 1;
      remainderCents -= 1;
      changed = true;

      if (remainderCents <= 0) {
        break;
      }
    }

    if (!changed) {
      break;
    }
  }

  return allocations;
}

function applyCouponsToWorkingUnits(lines: DiscountableCartLine[], coupons: AppliedCoupon[]) {
  const workingUnits: DiscountedUnit[] = lines.flatMap((line) =>
    Array.from({ length: line.quantity }, () => ({
      product: line.product,
      adjustedAmountCents: line.product.priceCents
    }))
  );
  const appliedCouponCodes: string[] = [];
  let totalDiscountCents = 0;

  for (const coupon of coupons) {
    const computedDiscount = calculateCouponDiscount(
      coupon,
      workingUnits.map((unit) => ({
        product: unit.product,
        amountCents: unit.adjustedAmountCents
      }))
    );

    if (computedDiscount.discountCents <= 0) {
      continue;
    }

    const eligibleUnitEntries = workingUnits
      .map((unit, index) => ({ unit, index }))
      .filter(({ unit }) => couponAppliesToProduct(coupon, unit.product.productCode));
    const unitDiscounts = distributeDiscountAcrossEligibleUnits(
      eligibleUnitEntries.map(({ unit }) => ({
        product: unit.product,
        amountCents: unit.adjustedAmountCents
      })),
      computedDiscount.discountCents
    );

    eligibleUnitEntries.forEach(({ index }, unitIndex) => {
      workingUnits[index].adjustedAmountCents = Math.max(
        0,
        workingUnits[index].adjustedAmountCents - (unitDiscounts[unitIndex] ?? 0)
      );
    });

    appliedCouponCodes.push(coupon.code);
    totalDiscountCents += computedDiscount.discountCents;
  }

  return {
    workingUnits,
    discountCents: totalDiscountCents,
    appliedCouponCodes
  };
}

export function buildDiscountedCartLines(lines: DiscountableCartLine[], coupons: AppliedCoupon[]) {
  const { workingUnits } = applyCouponsToWorkingUnits(lines, coupons);
  const groupedUnits = new Map<
    string,
    {
      product: DiscountableCartLine["product"];
      quantity: number;
      lineTotalCents: number;
      originalLineTotalCents: number;
    }
  >();

  for (const unit of workingUnits) {
    const existing = groupedUnits.get(unit.product.id);

    if (existing) {
      existing.quantity += 1;
      existing.lineTotalCents += unit.adjustedAmountCents;
      existing.originalLineTotalCents += unit.product.priceCents;
      continue;
    }

    groupedUnits.set(unit.product.id, {
      product: unit.product,
      quantity: 1,
      lineTotalCents: unit.adjustedAmountCents,
      originalLineTotalCents: unit.product.priceCents
    });
  }

  return lines.map((line) => {
    const grouped = groupedUnits.get(line.product.id);
    const originalLineTotalCents = line.product.priceCents * line.quantity;
    const lineTotalCents = grouped?.lineTotalCents ?? originalLineTotalCents;

    return {
      product: line.product,
      quantity: line.quantity,
      originalLineTotalCents,
      lineTotalCents,
      discountCents: Math.max(0, originalLineTotalCents - lineTotalCents)
    };
  });
}

export function buildDiscountedStripeLineItems(
  lines: DiscountableCartLine[],
  coupons: AppliedCoupon[]
) {
  const { workingUnits, discountCents: totalDiscountCents, appliedCouponCodes } =
    applyCouponsToWorkingUnits(lines, coupons);

  const groupedUnits = new Map<
    string,
    {
      product: DiscountableCartLine["product"];
      quantity: number;
      unitAmountCents: number;
    }
  >();

  for (const unit of workingUnits) {
    const key = `${unit.product.id}:${unit.adjustedAmountCents}`;
    const existing = groupedUnits.get(key);

    if (existing) {
      existing.quantity += 1;
      continue;
    }

    groupedUnits.set(key, {
      product: unit.product,
      quantity: 1,
      unitAmountCents: unit.adjustedAmountCents
    });
  }

  const rawLineItems = Array.from(groupedUnits.values()).map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: item.product.currency.toLowerCase(),
      unit_amount: item.unitAmountCents,
      product_data: {
        name: item.product.name,
        description: item.product.shortDescription
      }
    }
  }));
  const lineItems = rawLineItems.filter((item) => item.price_data.unit_amount > 0);

  return {
    discountCents: totalDiscountCents,
    appliedCouponCodes,
    lineItems,
    hasNonPositiveUnitAmount: rawLineItems.some((item) => item.price_data.unit_amount <= 0)
  };
}

export function couponsCanBeCombined(
  coupons: Array<Pick<CouponRecord, "combinable">>
) {
  return coupons.length <= 1 || coupons.every((coupon) => coupon.combinable);
}
