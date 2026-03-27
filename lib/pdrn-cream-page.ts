import { buildProductMediaUrl, getProductMediaFolder } from "@/lib/product-media";

const folder = getProductMediaFolder("pdrn-cream");

function productAsset(fileName: string, alt: string) {
  return {
    src: folder ? buildProductMediaUrl(folder, fileName) : "",
    alt
  };
}

export const pdrnCreamSeo = {
  title: "PDRN Cream | Salmon PDRN Cream & PDRN Capsule Cream",
  description:
    "Buy Neatique PDRN Cream, a 2026 Salmon PDRN Cream and PDRN Pink Cream with visible capsules, plush moisture, and a smoother-looking finish that pairs beautifully with PDRN Serum.",
  keywords: [
    "PDRN Cream",
    "Salmon PDRN Cream",
    "PDRN Pink Cream",
    "PDRN Capsule Cream",
    "buy PDRN Cream",
    "new PDRN Cream 2026",
    "PDRN cream for glowing skin",
    "PDRN cream with capsules"
  ]
};

export const pdrnCreamCustomerVoiceVideos = [
  {
    id: "7619379257407474974",
    creator: "@yennceto",
    title: "Soft capsule cream texture in motion",
    note: "A quick real-routine look at the plush finish shoppers notice first."
  },
  {
    id: "7619814505651932446",
    creator: "@anaisbeauty1",
    title: "A closer look at bounce, glow, and comfort",
    note: "A creator clip that helps new shoppers picture how PDRN Cream sits on skin."
  },
  {
    id: "7618994711973399839",
    creator: "@ninlama2020",
    title: "Daily wear feedback before you buy",
    note: "A simple customer voice moment showing why the formula feels easy to reach for."
  }
];

export const pdrnCreamHighlightCards = [
  {
    eyebrow: "Salmon PDRN focus",
    title: "A plush cream built to help skin look smoother, more rested, and softly radiant.",
    body:
      "This PDRN Cream is designed for days when skin feels tired, dry, rough, or visually flat and you want the finish to look more polished."
  },
  {
    eyebrow: "Capsule + cream payoff",
    title: "Visible capsules meet a rich pink cream for a fresher, more cushiony finish.",
    body:
      "The capsule format makes this PDRN Capsule Cream feel more special on first touch while helping the texture stay elegant once it melts in."
  },
  {
    eyebrow: "Routine ready",
    title: "Easy to use alone, even better when paired with PDRN Serum.",
    body:
      "Use it as your final layer when you want bounce, softness, and a comfort-first glow without making your routine feel complicated."
  }
];

export const pdrnCreamEditorialSections = [
  {
    id: "why-pdrn-cream",
    eyebrow: "PDRN Cream",
    title: "A new 2026 PDRN Cream made for shoppers who want bounce, softness, and a refined glow.",
    paragraphs: [
      "Neatique PDRN Cream is a comfort-rich moisturizer created for women who want their skincare to look polished on the vanity and feel luxurious on the skin. If you are searching for a Salmon PDRN Cream or a PDRN Pink Cream that feels plush rather than waxy, this is the texture story the formula is designed to tell.",
      "The finish is cushiony and elegant, with enough body to feel nourishing yet enough slip to spread smoothly over serum. It helps the complexion look more hydrated, visually smoother, and calmer after the last step of the routine."
    ],
    bullets: [
      "Designed to help skin feel comforted and look more luminous",
      "Soft pink cream texture that leaves a polished finish",
      "A strong final-step option for dry, dull, or texture-prone routines"
    ],
    image: productAsset(
      "PD01.png",
      "Close-up of Neatique PDRN Cream jar and texture for PDRN Cream and Salmon PDRN Cream shoppers"
    ),
    imagePosition: "right",
    imageVariant: "portrait"
  },
  {
    id: "capsule-cream",
    eyebrow: "PDRN Capsule Cream",
    title: "Why the capsule + cream format makes this moisturizer feel more elevated from the first scoop.",
    paragraphs: [
      "Inside the jar, the capsule beads and cream base work together to create a more layered sensory experience. As the formula is scooped and pressed onto the skin, the capsule elements blend into the cream so the texture feels richer, fresher, and more interesting than a flat jar cream.",
      "That is a big part of why shoppers search specifically for a PDRN Capsule Cream. The format turns the routine into more than a single moisturizing step. It gives the formula visual identity while helping the final layer feel silky, wrapped-in, and intentionally luxurious."
    ],
    bullets: [
      "Visible capsule look for a more premium first impression",
      "Cream base keeps application smooth and even",
      "Melts into a supple layer rather than sitting heavily on top"
    ],
    image: productAsset(
      "PD02.png",
      "Detailed texture image showing the capsule and cream format of Neatique PDRN Capsule Cream"
    ),
    imagePosition: "left",
    imageVariant: "square"
  },
  {
    id: "pdrn-benefits",
    eyebrow: "Salmon PDRN Cream benefits",
    title: "How PDRN helps the complexion look more revived, hydrated, and beautifully finished.",
    paragraphs: [
      "When shoppers look for a Salmon PDRN Cream, they are usually looking for a formula that supports a skin look that feels fuller, bouncier, and less visibly tired. This cream is built around that idea. It is a daily moisturizer made to help skin look more replenished after cleansing, serum, and treatment steps.",
      "On skin, the result is less about instant shine and more about a soft, healthy sheen. The complexion can look smoother around areas that often show roughness or dehydration, while the overall finish stays creamy, calm, and easy to wear from morning through evening."
    ],
    bullets: [
      "A good match for dry, comfort-seeking, or glow-focused routines",
      "Helps rough-feeling skin look softer and more refined",
      "Works as a day cream under SPF or a richer night finish"
    ],
    image: productAsset(
      "PD03.png",
      "Neatique PDRN Pink Cream close-up created for shoppers searching buy PDRN Cream online"
    ),
    imagePosition: "right",
    imageVariant: "portrait"
  }
] as const;

export const pdrnCreamTextureGallery = {
  eyebrow: "Texture story",
  title: "A closer look at the pink cream, the capsule detail, and the glossy cushion the formula leaves behind.",
  paragraphs: [
    "Close-up visuals help tell the full story of a PDRN Pink Cream better than ingredient language alone. You can see the plush cream body, the capsule detail, and the way the formula looks creamy rather than stiff.",
    "That balance matters when deciding whether to buy PDRN Cream online. These details show why the texture feels elegant in the jar and why the finish lands as soft, smooth, and cocooning once applied."
  ],
  images: [
    productAsset(
      "PD04.png",
      "Close-up texture detail of Neatique PDRN Cream showing the soft pink cream finish"
    ),
    productAsset(
      "PD05.png",
      "Macro image of Neatique PDRN Capsule Cream highlighting capsule texture and glossy finish"
    )
  ]
};

export const pdrnCreamRoutineContent = {
  eyebrow: "Use with PDRN Serum",
  title: "Pair PDRN Serum with PDRN Cream for a fuller bounce-and-comfort routine.",
  paragraphs: [
    "Use PDRN Serum first to give the skin a lighter, fresher hydration layer, then follow with PDRN Cream to seal in comfort and create a more plush finish. This two-step approach helps the routine feel balanced: serum brings fluid hydration and slip, while cream brings cushion and the final polished look.",
    "If your goal is skin that looks smooth, moisturized, and softly luminous, the duo is often more satisfying than using cream alone. The serum helps prep the surface, and the cream gives that richer wrap that makes the complexion look complete."
  ],
  steps: [
    {
      index: "01",
      title: "Apply PDRN Serum after cleansing.",
      body:
        "Use one to two droppers on clean skin so the complexion gets a silky first layer before cream."
    },
    {
      index: "02",
      title: "Let the serum settle, then smooth on PDRN Cream.",
      body:
        "Press the cream over the face and neck to bring in cushion, softness, and a more sealed-in finish."
    },
    {
      index: "03",
      title: "Use day or night depending on how much comfort your skin wants.",
      body:
        "Morning gives you a polished base under SPF, while evening gives you a richer, more cocooning last step."
    }
  ],
  image: productAsset(
    "PD06.png",
    "Neatique PDRN Serum and PDRN Cream routine image showing the best pairing order for smoother glowing skin"
  )
};
