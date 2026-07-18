import type { ProductRecord } from "@/lib/types";

export type ProductRoutineStep = {
  title: string;
  body: string;
};

export function formatProductOrigin(countryCode: string | null | undefined) {
  return countryCode?.trim().toUpperCase() === "CN"
    ? "Made in PRC"
    : countryCode?.trim() || null;
}

export function splitProductFacts(value: string | null | undefined) {
  return (value || "")
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildProductRoutine(product: Pick<ProductRecord, "name" | "category" | "directions">) {
  const category = product.category.toLowerCase();
  const isCleanser = category.includes("cleanser");
  const isBody = category.includes("body");
  const isCream = category.includes("cream") || category.includes("moisturizer") || category.includes("barrier");

  if (isCleanser) {
    return {
      am: [
        { title: "1. Cleanse", body: product.directions || `Use ${product.name} on damp skin, then rinse thoroughly.` },
        { title: "2. Treat", body: "Apply your selected serum after cleansing if your routine includes one." },
        { title: "3. Moisturize + SPF", body: "Finish with moisturizer and a labeled broad-spectrum sunscreen." }
      ],
      pm: [
        { title: "1. Remove daily buildup", body: product.directions || `Use ${product.name} as the rinse-off first step.` },
        { title: "2. Apply serum", body: "Use one leave-on serum at a time when introducing unfamiliar active formulas." },
        { title: "3. Finish with cream", body: "Complete the routine with the moisturizer that best matches your skin comfort." }
      ]
    };
  }

  if (isBody) {
    return {
      am: [
        { title: "1. Start on clean skin", body: "Apply after showering or whenever body skin feels dry." },
        { title: `2. Apply ${product.name}`, body: product.directions || "Massage a comfortable amount into the intended body areas." },
        { title: "3. Protect exposed skin", body: "Use a labeled sunscreen on exposed areas during the day." }
      ],
      pm: [
        { title: "1. Cleanse", body: "Apply to clean, dry or slightly damp body skin." },
        { title: `2. Apply ${product.name}`, body: product.directions || "Massage over dry or rough-feeling areas." },
        { title: "3. Let it settle", body: "Allow the cream to absorb before dressing or going to bed." }
      ]
    };
  }

  if (isCream) {
    return {
      am: [
        { title: "1. Cleanse", body: "Begin with your usual face cleanser and pat skin dry." },
        { title: "2. Apply serum if used", body: "Layer a thinner serum before the moisturizer step." },
        { title: `3. Moisturize + SPF`, body: `${product.directions || `Apply ${product.name} as the moisturizer step.`} Finish with sunscreen.` }
      ],
      pm: [
        { title: "1. Cleanse", body: "Remove daily buildup before applying leave-on skincare." },
        { title: "2. Apply serum if used", body: "Let the serum layer settle before adding cream." },
        { title: `3. Apply ${product.name}`, body: product.directions || "Use as the final moisturizer step." }
      ]
    };
  }

  return {
    am: [
      { title: "1. Cleanse", body: "Begin with your usual face cleanser and pat skin dry." },
      { title: `2. Apply ${product.name}`, body: product.directions || "Apply as the serum step before moisturizer." },
      { title: "3. Moisturize + SPF", body: "Follow with moisturizer and a labeled broad-spectrum sunscreen." }
    ],
    pm: [
      { title: "1. Cleanse", body: "Remove daily buildup before leave-on skincare." },
      { title: `2. Apply ${product.name}`, body: product.directions || "Apply as the serum step on clean skin." },
      { title: "3. Finish with cream", body: "Complete the routine with moisturizer when needed." }
    ]
  };
}

export function buildProductFaqs(
  product: Pick<ProductRecord, "name" | "directions" | "suitableFor" | "cautionFor">
) {
  return [
    {
      question: `How should I use ${product.name}?`,
      answer:
        product.directions ||
        "Follow the product packaging directions and introduce one unfamiliar cosmetic at a time."
    },
    {
      question: `Who is ${product.name} suitable for?`,
      answer:
        product.suitableFor ||
        "Review the product description, full ingredient list and packaging directions against your own skin needs before use."
    },
    {
      question: "Should I patch test this product?",
      answer:
        "Yes. Patch test an unfamiliar cosmetic before broader use, especially if your skin is easily reactive. Do not use it if you have a known sensitivity to an ingredient, and stop use if irritation develops."
    },
    {
      question: "What should I know before ordering?",
      answer:
        "Neatique ships to the mainland United States. Paid orders are typically processed within one business day, and eligible direct website purchases can request return support within 30 days of delivery."
    },
    ...(product.cautionFor
      ? [{ question: "Who should avoid or use caution with this product?", answer: product.cautionFor }]
      : [])
  ];
}
