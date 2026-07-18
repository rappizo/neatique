export type ArticleEnhancementSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

const ARTICLE_ENHANCEMENTS: Record<string, ArticleEnhancementSection[]> = {
  "what-is-pdrn-skincare": [
    {
      heading: "Start with the product format, not the trend",
      paragraphs: [
        "PDRN is used as an ingredient story across cleansers, serums and creams, but those formats do different jobs. A rinse-off cleanser begins the routine, a serum provides a thin leave-on layer, and a cream acts as the moisturizer step. Comparing format and complete product directions is more useful than assuming every PDRN formula will feel or perform the same way.",
        "Ingredient source, concentration and complete formula details should come from verified packaging or manufacturer documentation. If those facts are not published, do not infer them from the product name alone."
      ]
    },
    {
      heading: "A simple way to add PDRN skincare",
      paragraphs: [
        "Introduce one unfamiliar product at a time so you can judge its texture and how your skin responds. Keep the surrounding routine straightforward: cleanse, apply a serum if you use one, moisturize, and finish daytime care with sunscreen."
      ],
      bullets: [
        "Choose serum when you want a lightweight layer under moisturizer.",
        "Choose cream when you want the PDRN product to be your finishing moisturizer step.",
        "Patch test unfamiliar cosmetics and stop use if irritation develops."
      ]
    }
  ],
  "serum-vs-cream-routine-order": [
    {
      heading: "Why serum normally comes before cream",
      paragraphs: [
        "Serums are usually the thinner leave-on layer, while creams are designed to provide a more substantial finishing step. Applying the thinner texture first helps keep the purpose of each product clear and avoids asking a light serum to sit on top of a heavier moisturizer.",
        "This is a practical texture rule rather than a reason to add more products. If a cream alone leaves your skin comfortable, a serum is optional."
      ]
    },
    {
      heading: "A straightforward layering sequence",
      paragraphs: [
        "Follow the directions for each product and allow one layer to settle before applying the next. During the day, sunscreen remains the final skincare step."
      ],
      bullets: [
        "Cleanser: remove daily buildup and rinse.",
        "Serum: apply the thinner leave-on layer, if used.",
        "Cream: finish with moisturizer.",
        "Sunscreen: complete the daytime routine according to its label."
      ]
    },
    {
      heading: "When to simplify",
      paragraphs: [
        "If products pill, feel overly heavy or make it hard to identify the source of irritation, reduce the number of layers. Add products back one at a time only when each step has a clear purpose."
      ]
    }
  ]
};

export function getArticleEnhancements(slug: string) {
  return ARTICLE_ENHANCEMENTS[slug] ?? [];
}
