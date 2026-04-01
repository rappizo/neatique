import { buildProductMediaUrl, getProductMediaFolder } from "@/lib/product-media";

const folder = getProductMediaFolder("pdrn-serum");

function landingAsset(fileName: string, alt: string) {
  return {
    src: folder ? buildProductMediaUrl(folder, fileName) : "",
    alt,
    width: 1000,
    height: 747
  };
}

export const pdrnSerumSeo = {
  title: "Salmon PDRN Pink Serum | PDRN Serum for Face",
  description:
    "Shop Neatique Salmon PDRN Pink Serum, a PDRN serum for face with deep hydration, peptide support, and a smooth fresh finish designed for daily repair-focused routines.",
  keywords: [
    "salmon pdrn pink serum",
    "pdrn serum",
    "pdrn serum for face",
    "salmon dna serum",
    "sodium dna serum",
    "pink collagen serum",
    "peptide serum for face",
    "hydrating serum",
    "skin renewal serum",
    "deep hydration serum",
    "repair serum for face",
    "lightweight pink serum",
    "facial serum for dull skin",
    "smoothing serum for face",
    "daily repair serum",
    "glow serum for face",
    "pdrn and peptide serum",
    "moisture barrier serum",
    "revitalizing face serum",
    "serum for dry dull skin"
  ]
};

export const pdrnSerumHeroCards = [
  {
    eyebrow: "Salmon PDRN Pink Serum",
    title: "A silky pink serum made to leave skin looking softer, fresher, and better hydrated.",
    body:
      "This is the lightweight first treatment layer for women who want comfort, bounce, and a polished glow without a sticky or overloaded finish."
  },
  {
    eyebrow: "PDRN Serum for Face",
    title: "Built for daily routines that need easy layering, a smooth feel, and a refined visual finish.",
    body:
      "The formula settles quickly, layers beautifully under cream, and fits both simple morning routines and more complete night rituals."
  },
  {
    eyebrow: "Deep Hydration & Repair",
    title: "A hydration-focused serum that helps the skin feel replenished while supporting a more rested look.",
    body:
      "Think of it as the soft, fluid step that helps dry dull skin feel more cared for before moisturizer seals everything in."
  }
] as const;

export const pdrnSerumIngredientCards = [
  {
    title: "Salmon PDRN",
    body:
      "Salmon PDRN gives the formula its signature identity and helps position it as a daily repair serum for face routines that want bounce, softness, and a smoother-looking surface."
  },
  {
    title: "Sodium DNA",
    body:
      "Sodium DNA supports the serum’s skin-renewal story and gives shoppers a strong answer when they are specifically searching for a sodium DNA serum or salmon DNA serum."
  },
  {
    title: "Peptide Blend",
    body:
      "The peptide blend helps round out the formula so the serum feels more complete in routines focused on hydration, softness, and a more refined look over time."
  },
  {
    title: "Pink Collagen Serum",
    body:
      "The pink serum look gives the product a polished vanity presence while reinforcing the feel of a lightweight pink collagen serum made for daily comfort and glow."
  }
] as const;

export const pdrnSerumBenefitCards = [
  {
    title: "Hydrating Serum",
    body:
      "A fluid layer that helps skin feel comfortably hydrated and ready for cream without turning greasy or heavy."
  },
  {
    title: "Skin Renewal Serum",
    body:
      "Ideal for routines that want a smoother-looking finish and a more rested feel after cleansing."
  },
  {
    title: "Smoother Looking Skin",
    body:
      "The formula supports a softer, more refined surface so the complexion looks less flat and rough."
  },
  {
    title: "Radiant, Soft, Fresh-Looking Skin",
    body:
      "It leaves behind a clean dewy glow that feels polished rather than shiny, especially when followed with cream."
  }
] as const;

export const pdrnSerumEditorialSections = [
  {
    id: "salmon-pdrn-serum-story",
    eyebrow: "Salmon PDRN pink serum",
    title: "A PDRN serum for face routines that want bounce, fluid hydration, and a fresher-looking finish.",
    paragraphs: [
      "Neatique PDRN Serum is designed for shoppers who want their first treatment layer to feel silky, easy, and visibly comforting. If you are searching for a Salmon PDRN Pink Serum, this is the kind of formula story the bottle is built around: fluid hydration, a polished vanity look, and a finish that makes skin appear smoother and better rested.",
      "The texture stays light enough for daytime layering yet satisfying enough for evening use when the complexion feels dry, flat, or a little depleted. That balance is what makes it a strong PDRN serum for face routines that need daily consistency."
    ],
    bullets: [
      "Lightweight pink serum texture that layers easily",
      "Fits routines focused on deep hydration and daily repair",
      "Leaves skin looking softly fresh rather than overly glossy",
      "Sits comfortably as the first serum step before cream"
    ],
    image: landingAsset(
      "LP1.jpg",
      "Neatique Salmon PDRN Pink Serum in a soft editorial setting for PDRN serum for face routines"
    ),
    imagePosition: "right"
  },
  {
    id: "ingredient-focus",
    eyebrow: "Salmon DNA + peptide serum",
    title: "Why Salmon PDRN, Sodium DNA, and a peptide blend make this serum feel complete instead of one-note.",
    paragraphs: [
      "Shoppers looking for a salmon DNA serum or sodium DNA serum are usually looking for a formula that feels more purposeful than a simple hydrating layer. Here, Salmon PDRN gives the serum its repair-focused identity, while Sodium DNA and the peptide blend support a more rounded daily-use experience.",
      "That combination helps position the formula as both a hydrating serum and a skin renewal serum. It feels fluid on contact, but the finish is not fleeting. Skin feels more cushioned, more comfortable, and better prepared for the next layer."
    ],
    bullets: [
      "Salmon PDRN anchors the formula identity",
      "Sodium DNA supports the repair-focused routine story",
      "Peptides help the serum feel smoother and more refined in daily use",
      "Keeps the formula story centered on softness, renewal, and ease"
    ],
    image: landingAsset(
      "LP2.jpg",
      "Close-up editorial image of Neatique PDRN Serum highlighting the branded bottle and silky pink serum texture"
    ),
    imagePosition: "left"
  },
  {
    id: "repair-hydration-feel",
    eyebrow: "Deep hydration serum",
    title: "The finish is light, smooth, and dewy, making it easy to keep in rotation for dry dull skin.",
    paragraphs: [
      "A good deep hydration serum should feel easy to reach for twice a day. This formula is made for exactly that kind of routine. It absorbs quickly, doesn’t leave behind a thick film, and helps the complexion feel replenished before cream or sunscreen.",
      "That is a big reason it works well as a daily repair serum, a moisture barrier serum, and a revitalizing face serum. It gives enough comfort to matter while keeping the routine breathable."
    ],
    bullets: [
      "Useful for dry, dehydrated, or visually tired-looking skin",
      "Comfortable under moisturizer and SPF",
      "Helps support a radiant, soft, fresh-looking finish",
      "Easy to keep in rotation for both morning and night routines"
    ],
    image: landingAsset(
      "LP3.jpg",
      "Model applying Neatique PDRN Serum-inspired skincare for a hydrating serum and repair serum for face landing page"
    ),
    imagePosition: "right"
  },
  {
    id: "layering-routine",
    eyebrow: "PDRN and peptide serum",
    title: "Use it after cleansing, then follow with cream to lock in a more plush and polished routine finish.",
    paragraphs: [
      "If you are wondering how to use PDRN serum, the easiest approach is also the best one: apply it on clean skin, let it settle, and follow with moisturizer. It is an easy peptide serum for face routines because the texture does not fight the next step.",
      "For shoppers with dry or dull skin, pairing this serum with PDRN Cream or another richer moisturizer makes the overall routine feel fuller and more complete. The serum brings fluid hydration; the cream brings the final soft wrap."
    ],
    bullets: [
      "Use morning and night after cleansing",
      "Follow with cream for a more cushioned finish",
      "A simple answer for shoppers asking whether a peptide serum can be used daily",
      "Pairs naturally with PDRN Cream for a fuller final layer"
    ],
    image: landingAsset(
      "LP4.jpg",
      "Neatique PDRN Serum bottle in a vanity routine scene for peptide serum for face and moisture barrier serum shoppers"
    ),
    imagePosition: "left"
  }
] as const;

export const pdrnSerumGallery = {
  eyebrow: "Landing page imagery",
  title: "A closer look at the bottle, the serum texture, and the clean editorial world around the formula.",
  description:
    "These visuals help communicate the silky texture, soft pink serum look, and refined feel that make the product easy to understand before checkout.",
  images: [
    landingAsset(
      "LP5.jpg",
      "Neatique PDRN Serum styled as a lightweight pink serum with a premium hydration-focused editorial feel"
    ),
    landingAsset(
      "LP6.jpg",
      "Neatique PDRN Serum in a polished vanity setup for hydrating serum and smoothing serum for face shoppers"
    ),
    landingAsset(
      "LP7.jpg",
      "Model skincare lifestyle image for Neatique PDRN Serum showing fresh radiant soft-looking skin without generic products"
    )
  ]
};

export const pdrnSerumFaqs = [
  {
    question: "What is PDRN serum?",
    answer:
      "PDRN serum is a lightweight treatment step used after cleansing and before cream. Neatique PDRN Serum is designed to support deep hydration, a smoother-looking surface, and a fresher more rested finish in everyday routines."
  },
  {
    question: "How to use PDRN serum?",
    answer:
      "Apply one to two droppers on clean skin, morning and night. Let it settle for a moment, then follow with moisturizer. In the daytime, finish with sunscreen."
  },
  {
    question: "Is PDRN serum good for dry skin?",
    answer:
      "Yes, especially when dry skin wants a lighter first layer before cream. The texture helps bring fluid hydration and softness, and it works especially well when followed with a richer moisturizer."
  },
  {
    question: "Can I use peptide serum daily?",
    answer:
      "Yes. This formula is designed as a daily peptide serum for face routines, so it fits easily into both morning and evening use when your skin likes consistent hydration and a smoother-looking finish."
  }
] as const;
