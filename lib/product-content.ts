import { buildProductMediaUrl, getLocalProductGallery } from "@/lib/product-media";

export type ProductStorySection = {
  title: string;
  body: string | string[];
};

type ProductStoryImage = {
  src: string;
  alt: string;
};

type ProductStory = {
  gallery: string[];
  heroLabel?: string;
  detailImages?: ProductStoryImage[];
  sections: ProductStorySection[];
};

const pdrnCleanserFolder = "HH080 PDRN Cleanser";
const pdrnCleanserGallery = Array.from({ length: 9 }, (_, index) =>
  buildProductMediaUrl(pdrnCleanserFolder, `${String(index).padStart(2, "0")}.png`)
);
const pdrnCleanserDetailImages = Array.from({ length: 6 }, (_, index) => {
  const fileName = `TK${String(index + 2).padStart(2, "0")}.png`;

  return {
    src: buildProductMediaUrl(pdrnCleanserFolder, fileName),
    alt: `Neatique PDRN Pink 99% + Niacinamide Whip Cleanser detail image ${index + 1}`
  };
});

export const productStories: Record<string, ProductStory> = {
  "pdrn-cleanser": {
    gallery: pdrnCleanserGallery,
    heroLabel: "HH080 PDRN Cleanser",
    detailImages: pdrnCleanserDetailImages,
    sections: [
      {
        title: "PDRN Pink 99% + Niacinamide Power Cleanse",
        body: [
          "A pink-powered daily cleanser designed to refresh dull, tired-looking skin while washing away buildup, excess oil, and daily impurities in one soft, creamy cleanse.",
          "Neatique PDRN Pink 99% + Niacinamide Whip Cleanser is made to give skin a fresh, clean, hydrated-looking start every day, with a creamy texture that turns cleansing into the first skin-care step rather than a basic rinse.",
          "Powered by PDRN Pink 99%, niacinamide, and a rich whip-foam texture, this cleanser helps remove daily dirt, excess oil, sunscreen residue, and makeup residue while supporting a soft, smooth, healthy-looking glow."
        ]
      },
      {
        title: "Deep Cleanse Without The Tight Feeling",
        body: [
          "The rich whip foam helps lift away dirt, oil, sunscreen residue, and makeup residue while leaving skin feeling soft, hydrated, and comfortable - never stripped or dry.",
          "This is not a harsh cleanser that leaves your skin feeling tight. It is designed for a deep yet comfortable cleanse, the kind of clean that makes skin feel refreshed, balanced, and ready for the next steps in your routine.",
          "The creamy whip foam expands into a rich lather that cushions the skin while cleansing. It helps wash away impurities from the skin surface and pores, leaving the complexion feeling fresh, clean, and smooth without the over-dry, squeaky feeling many cleansers leave behind.",
          "Deep daily cleanse, soft hydrated finish, and brighter fresher-looking skin all work together so skin feels clean, fresh, breathable, and comfortable after rinsing."
        ]
      },
      {
        title: "Creamy Whip Foam Texture",
        body: [
          "A dense, cushiony foam wraps the skin in a smooth cleansing layer, making every wash feel soft, luxurious, and skin-caring.",
          "The texture starts as a creamy cleanser and transforms into a dense, soft whip foam when mixed with water. The foam feels smooth, rich, and cloud-like on the skin, helping create a gentle but effective cleansing experience.",
          "After rinsing, skin feels fresh, clean, soft, comfortable, hydrated, smooth-looking, and ready for skincare."
        ]
      },
      {
        title: "Supports A Healthy, Even-Looking Glow",
        body: [
          "Infused with niacinamide to help improve the look of dullness and uneven tone, leaving skin looking fresher, clearer, and more radiant after cleansing.",
          "PDRN Pink 99% gives the formula a premium skin-care feel and supports a fresh, healthy-looking glow. It helps make cleansing feel less basic and more treatment-like.",
          "Niacinamide is loved for helping improve the look of dullness, uneven tone, and tired-looking skin. In this cleanser, it helps support a clearer, smoother, more radiant-looking finish.",
          "Creamy Whip Foam creates a rich, soft cleansing cushion. It helps rinse away daily buildup while keeping skin feeling soft, clean, and comfortable."
        ]
      },
      {
        title: "AM And PM Friendly Daily Cleanser",
        body: [
          "Gentle enough for morning and night use, this cleanser is the perfect first step before serum, cream, or your full Neatique PDRN skincare routine.",
          "Wet face with lukewarm water. Apply a small amount of cleanser to your palm, add water, and lather into a creamy foam. Massage gently over the face in circular motions, then rinse thoroughly.",
          "Use it before Neatique PDRN5+ Serum and PDRN Pink Collagen Capsule Cream when you want a complete pink skincare routine for skin that looks fresh, hydrated, and radiant."
        ]
      },
      {
        title: "A Complete Pink PDRN Routine Starter",
        body: [
          "This cleanser is ideal for anyone who wants a daily cleanser that feels gentle but effective, a deep-clean feeling without dryness, and a soft foam texture instead of a harsh gel cleanser.",
          "It is also a strong fit for routines focused on removing oil, dirt, sunscreen, and makeup residue while keeping the complexion looking fresher, brighter, and more comfortable.",
          "Step 1: Cleanser. Start with Neatique PDRN Pink 99% + Niacinamide Whip Cleanser to remove daily buildup and refresh the skin.",
          "Step 2: Serum. Apply Neatique PDRN5+ Serum to support hydration and a smoother-looking complexion.",
          "Step 3: Cream. Seal in moisture with Neatique PDRN Pink Collagen Capsule Cream for a soft, plump, glowing finish. Together, the cleanser, serum, and cream create a complete pink skincare routine."
        ]
      }
    ]
  },
  "kit9-niacinamide-turmeric-kojic-acid-serum": {
    gallery: getLocalProductGallery("kit9-niacinamide-turmeric-kojic-acid-serum"),
    heroLabel: "HH074 KIT9+ Serum",
    sections: [
      {
        title: "1. What It Is",
        body:
          "Neatique KIT9+ Niacinamide + Turmeric + Kojic Acid Serum is a lightweight daily serum made for routines focused on refined-looking texture, a more even-looking tone, and a polished golden glow."
      },
      {
        title: "2. Texture",
        body:
          "The serum feels fluid, silky, and fast to absorb. It layers smoothly under moisturizer and sunscreen without leaving a sticky finish or making the routine feel crowded."
      },
      {
        title: "3. Formula Focus",
        body:
          "KIT9+ centers on 6% niacinamide, 1.5% turmeric, and 1.5% kojic acid. The blend gives the serum a clear tone-and-texture identity while keeping the formula approachable for everyday use."
      },
      {
        title: "4. Texture Support",
        body:
          "Niacinamide helps the formula fit routines that want a smoother-looking skin surface and a cleaner daily finish. It is a useful anchor when the complexion looks uneven, rough, or tired."
      },
      {
        title: "5. Turmeric Conditioning",
        body:
          "Turmeric gives the serum its golden antioxidant and conditioning story. It supports the look of calm, healthy-looking skin while making the product feel distinctive on the shelf."
      },
      {
        title: "6. Kojic Acid Direction",
        body:
          "Kojic acid supports the serum's more uniform-looking tone direction. It is a strong fit for shoppers who want their routine to look brighter and more consistent over time."
      },
      {
        title: "7. When To Use It",
        body:
          "Apply after cleansing and before moisturizer, morning or night. In the daytime, follow with sunscreen so the tone-focused routine stays complete and well protected."
      },
      {
        title: "8. Who It Is For",
        body:
          "KIT9+ is a strong choice for shoppers who want a niacinamide serum, turmeric serum, or kojic acid serum in one simple daily layer. It fits especially well for dullness, uneven-looking tone, and texture care."
      },
      {
        title: "9. Routine Pairing",
        body:
          "Pair it with a light moisturizer when you want a clean daytime finish, or layer it before a richer cream at night when the skin wants extra comfort."
      },
      {
        title: "10. Packaging Details",
        body:
          "The golden dropper bottle makes the formula direction easy to recognize, while the 30 mL size keeps the serum practical for steady morning and evening use."
      }
    ]
  },
  "bee-venom-body-cream": {
    gallery: getLocalProductGallery("bee-venom-body-cream"),
    heroLabel: "HH049 Bee Venom Body Cream",
    sections: [
      {
        title: "1. What It Is",
        body:
          "Neatique Bee Venom Body Cream is a moisturizing body cream created for dry, rough, and uneven-looking skin on the body. It is designed for the areas that often need extra attention, including arms, legs, neck, shoulders, elbows, knees, and calves."
      },
      {
        title: "2. Texture",
        body:
          "The cream feels rich enough to comfort dry skin yet still spreads smoothly and absorbs with a clean finish. It leaves the skin feeling softer and more refreshed without turning sticky or overly heavy."
      },
      {
        title: "3. Bee Venom And Hyaluronic Acid Formula",
        body:
          "The formula is centered around bee venom and hyaluronic acid, a pairing that gives the cream both its moisture story and its smooth, supple after-feel. It is made for daily body care rather than for a complicated treatment routine."
      },
      {
        title: "4. Why It Works Well For Dry, Rough Areas",
        body:
          "Dry areas on the body often need a cream that feels comforting right away and still leaves the skin looking smoother later. This formula is built for exactly that type of daily use, especially when the skin feels rough, tight, or visibly dry."
      },
      {
        title: "5. Daily Body Care Routine Fit",
        body:
          "Use it after showering, before bed, or anytime the skin feels dry and in need of support. Because it absorbs smoothly, it fits easily into regular body care routines and does not feel like an extra-fussy step."
      },
      {
        title: "6. Where To Use It",
        body:
          "It is especially useful for elbows, knees, upper arms, calves, neck, and shoulders. These are the places where uneven texture and dryness often show up first, and where a consistent body cream can make the skin feel much better cared for."
      },
      {
        title: "7. Daytime Feel",
        body:
          "During the day, the finish feels smooth and nourished rather than greasy. That makes it easy to use under clothing and throughout the day whenever the skin needs a quick layer of moisture."
      },
      {
        title: "8. Night Routine Comfort",
        body:
          "At night, the cream feels especially satisfying because it helps dry skin feel cushioned and more settled by morning. It is a simple final step when the body needs comfort and a softer-looking finish overnight."
      },
      {
        title: "9. Who It Is For",
        body:
          "This is a strong option for shoppers looking for a moisturizing body cream with a comfortable skin feel and visible smoothness. It suits anyone who wants dry, stressed-looking skin to feel softer, silkier, and more nourished with regular use."
      },
      {
        title: "10. What Makes It Easy To Keep Using",
        body:
          "Because the cream balances richness with a non-greasy finish, it is easy to keep near a shower, bedside, or vanity and use consistently. That kind of everyday practicality is what makes a body cream worth staying with."
      }
    ]
  },
  "nad-collagen-peptide-serum": {
    gallery: getLocalProductGallery("nad-collagen-peptide-serum"),
    heroLabel: "HH076 NAD+ Collagen Peptide Serum",
    sections: [
      {
        title: "1. What It Is",
        body:
          "Neatique NAD+ Collagen Peptide Serum is a daily peptide serum built around an 8AM wake-up glow and 8PM recharge care idea. It is made for shoppers who want one bottle to cover fresh daytime hydration and a smoother, more rested-looking finish at night."
      },
      {
        title: "2. Texture",
        body:
          "The texture feels lightweight, silky, and quick to absorb. It layers easily under moisturizer and makeup in the morning, and it still feels substantial enough at night to leave skin cushioned rather than tight."
      },
      {
        title: "3. The 8+ Concept",
        body:
          "The 8+ concept is simple: use the same serum in an easy AM and PM rhythm. In the morning it helps skin look fresher and more radiant, and in the evening it supports deep hydration and a softer, smoother-looking complexion by the next day."
      },
      {
        title: "4. NAD+ And Collagen Peptide Direction",
        body:
          "This formula is centered around NAD+ plus a collagen peptide and multi-peptide blend. Together, they shape the serum's firm-look identity and support skin that wants to appear smoother, more elastic, and more refined over time."
      },
      {
        title: "5. Why Niacinamide And Hyaluronic Acid Matter",
        body:
          "Niacinamide and hyaluronic acid help give the serum its easy daily wear. They add layer-friendly hydration that helps skin look plump and fresh without leaving behind a sticky finish that can make the rest of the routine feel heavy."
      },
      {
        title: "6. Morning Routine Fit",
        body:
          "In the morning, this serum is especially useful for shoppers who want hydration that wears well under moisturizer, sunscreen, and makeup. It helps the complexion look awake and polished while still keeping the routine light."
      },
      {
        title: "7. Evening Routine Feel",
        body:
          "At night, the same formula shifts into a more comfort-focused role. It helps support the look of the moisture barrier and locks in hydration so skin feels softer, more cushioned, and less dry by morning."
      },
      {
        title: "8. Who It Is For",
        body:
          "This serum is a strong option for shoppers who want a peptide serum, an NAD+ serum, or a collagen peptide serum that feels elegant in both AM and PM routines. It fits especially well when the goal is smoother-looking skin with a fuller, healthier-looking finish."
      },
      {
        title: "9. How To Use It",
        body:
          "Apply 2 to 3 pumps on the face and neck after cleansing, then follow with moisturizer. Use sunscreen in the morning. The airless pump keeps dispensing clean and controlled, which makes the routine feel simple and consistent."
      },
      {
        title: "10. What Makes It Easy To Keep Using",
        body:
          "Because the formula is light enough for daytime and comforting enough for evening care, it is easy to keep in steady rotation. That balance is what makes it feel like a practical daily serum instead of a complicated treatment step."
      }
    ]
  },
  "nt16-niacinamide-tranexamic-serum": {
    gallery: getLocalProductGallery("nt16-niacinamide-tranexamic-serum"),
    heroLabel: "HH067 NT16 11% Niacinamide + 5% Tranexamic Serum",
    sections: [
      {
        title: "1. What It Is",
        body:
          "Neatique NT16 11% Niacinamide + 5% Tranexamic Serum is a daily niacinamide serum and tranexamic serum created for routines focused on a more even-looking tone, a clearer-looking surface, and a smoother finish."
      },
      {
        title: "2. Texture",
        body:
          "The texture feels silky, fluid, and easy to spread. It settles quickly on the skin, making it simple to layer under moisturizer or sunscreen without leaving the surface heavy."
      },
      {
        title: "3. Why The Name Is NT16",
        body:
          "NT16 comes from the formula's two signature percentages and hero ingredient direction. The identity points directly to the high niacinamide level and the tranexamic acid support built into the serum."
      },
      {
        title: "4. Niacinamide Serum Focus",
        body:
          "Shoppers looking for a niacinamide serum often want a formula that supports a cleaner-looking, more balanced skin surface. NT16 is designed to fit that need while still feeling elegant enough for daily use."
      },
      {
        title: "5. Tranexamic Serum Direction",
        body:
          "The 5% tranexamic acid level gives the formula a strong tranexamic serum identity. It is especially relevant for routines built around a more even-looking tone and support for visible post-blemish marks or uneven-looking areas."
      },
      {
        title: "6. Why It Works As A Dark Spot Serum",
        body:
          "Many shoppers search for a dark spot serum when they want a daily-use product that helps the complexion look more even over time. NT16 answers that with a lightweight feel that is easy to keep consistent with."
      },
      {
        title: "7. How The Two Ingredients Work Together",
        body:
          "Niacinamide helps support a smoother-looking, more refined skin surface, while tranexamic acid adds targeted support for tone-evening routines. Together they create a serum that feels purposeful without becoming complicated."
      },
      {
        title: "8. Who It Is For",
        body:
          "NT16 is a strong option for shoppers who want a niacinamide serum, a tranexamic serum, or a dark spot serum in one bottle. It fits especially well into routines focused on visual clarity, smoothness, and a more even-looking finish."
      },
      {
        title: "9. How To Use It",
        body:
          "Apply the serum after cleansing and before cream. In the morning, follow with sunscreen. In the evening, follow with a cream when you want the routine to feel more cushioned and complete."
      },
      {
        title: "10. What Makes It Easy To Keep Using",
        body:
          "Because the texture is light, familiar, and easy to layer, NT16 can stay in regular rotation without making the routine feel crowded. That consistency is a big part of why this style of dark spot serum works well in daily life."
      }
    ]
  },
  "tnv3-tranexamic-nicotinamide-serum": {
    gallery: getLocalProductGallery("tnv3-tranexamic-nicotinamide-serum"),
    heroLabel: "HH060 TNV3 10% Tranexamic Acid + 2% Nicotinamide Secrum",
    sections: [
      {
        title: "1. What It Is",
        body:
          "Neatique TNV3 10% Tranexamic Acid + 2% Nicotinamide Serum + Vitamin C is a daily tranexamic serum created for routines focused on a more even-looking tone, cleaner-looking skin clarity, and a smoother visual finish."
      },
      {
        title: "2. Texture",
        body:
          "The texture feels fluid, silky, and fast to settle. It spreads easily across the skin and layers comfortably under moisturizer or sunscreen without leaving a sticky surface behind."
      },
      {
        title: "3. Why The Name Is TNV3",
        body:
          "TNV3 comes from the three hero ingredients at the center of the formula: Tranexamic Acid, Nicotinamide, and Vitamin C. The name makes the formula identity simple to remember while reflecting the ingredient-led concept behind the serum."
      },
      {
        title: "4. Tranexamic Serum Focus",
        body:
          "Shoppers looking for a tranexamic serum usually want a product that fits into daily routines while helping the complexion look more even and more visually refined. This serum is built to serve that role in a light, easy-to-layer format."
      },
      {
        title: "5. Tranexamic Acid In The Routine",
        body:
          "Tranexamic acid gives the formula its tone-evening direction. It is especially relevant when a shopper wants a daily serum for areas that look uneven after blemishes, sun exposure, or overall skin fatigue."
      },
      {
        title: "6. Nicotinamide Serum Support",
        body:
          "Nicotinamide helps round out the formula by supporting a smoother-looking, more balanced surface. In a nicotinamide serum, shoppers often want a finish that looks cleaner and more settled rather than overloaded."
      },
      {
        title: "7. Vitamin C Contribution",
        body:
          "Vitamin C adds another layer to the formula story by supporting a fresher, more energized overall look. Together with tranexamic acid and nicotinamide, it helps the serum feel purposeful without becoming complicated."
      },
      {
        title: "8. Why It Works As A Dark Spot Serum",
        body:
          "Many shoppers search for a dark spot serum when they want a formula that can fit into daily use while supporting a more even-looking appearance. TNV3 answers that need with a smooth serum texture that feels elegant enough for both morning and evening routines."
      },
      {
        title: "9. How To Use It",
        body:
          "Apply the serum after cleansing and before cream. In the morning, follow with sunscreen. At night, pair it with a cream like PDRN Cream or Snail Mucin Cream when you want the routine to feel more cushioned and complete."
      },
      {
        title: "10. What Makes It Easy To Stay Consistent With",
        body:
          "Because the texture is familiar, light, and comfortable, TNV3 is easy to keep in regular rotation. That makes it a strong option for shoppers who want a daily tranexamic serum, dark spot serum, or nicotinamide serum without adding friction to the routine."
      }
    ]
  },
  "at13-arbutin-tranexamic-cream": {
    gallery: getLocalProductGallery("at13-arbutin-tranexamic-cream"),
    heroLabel: "HH061 AT13 8% Arbutin + 5% Tranexamic Cream",
    sections: [
      {
        title: "1. What It Is",
        body:
          "Neatique AT13 8% Arbutin + 5% Tranexamic Cream is a daily brightening cream created for shoppers who want their moisturizer to help skin look clearer, more even, and softly radiant."
      },
      {
        title: "2. Texture",
        body:
          "The texture feels silky, smooth, and comfortable on the skin. It spreads easily without feeling heavy and leaves behind a polished finish that still feels breathable."
      },
      {
        title: "3. Formula Focus",
        body:
          "This cream is centered around 8% arbutin and 5% tranexamic acid, a pairing often chosen in tone-correcting routines when shoppers want to support a brighter and more refined overall look."
      },
      {
        title: "4. Why Customers Reach For It",
        body:
          "Shoppers usually reach for this kind of cream when they want their routine to feel more targeted toward visible unevenness while still staying soft, simple, and easy to wear every day."
      },
      {
        title: "5. Who It Is For",
        body:
          "AT13 is a beautiful choice for normal, combination, or dull-looking skin, and it also works well for anyone who wants a brightening cream that still feels elegant rather than clinical."
      },
      {
        title: "6. When To Use It",
        body:
          "Use it after serum as the final cream step in the morning or evening. During the day it creates a clean base under sunscreen, and at night it gives the routine a more finished, comforted feel."
      },
      {
        title: "7. Daily Finish",
        body:
          "On skin, the finish looks smooth, softly luminous, and refined. It gives brightness-focused routines a more elevated feel without leaving behind a greasy or overloaded surface."
      },
      {
        title: "8. Routine Pairing",
        body:
          "It pairs especially well with lightweight hydrating serums, including PDRN Serum or Snail Mucin Serum, when you want to keep the routine balanced between glow, comfort, and clarity."
      },
      {
        title: "9. What Makes It Easy To Use",
        body:
          "Because it functions as a familiar cream step, it is easy to keep consistent with. That makes it appealing for shoppers who want a more tone-focused routine without adding too many separate layers."
      },
      {
        title: "10. Packaging Details",
        body:
          "The jar is designed to look polished and modern on a vanity, matching the product's clean, brightening identity while still feeling feminine and easy to love in everyday use."
      }
    ]
  },
  "pdrn-cream": {
    gallery: getLocalProductGallery("pdrn-cream"),
    heroLabel: "HH075 PDRN Cream",
    sections: [
      {
        title: "1. What It Is",
        body:
          "Neatique PDRN Cream is a rich daily moisturizer designed to leave skin feeling cushioned, comfortable, and softly radiant. It is the kind of finishing step that makes a routine feel complete."
      },
      {
        title: "2. Texture",
        body:
          "The cream feels smooth, plush, and nourishing without becoming overly greasy. It spreads beautifully over the skin and leaves behind a soft, velvety finish."
      },
      {
        title: "3. Daily Skin Feel",
        body:
          "After application, skin feels wrapped in moisture and looks more rested. It is especially lovely when the complexion feels dry, tight, or a little worn out from the day."
      },
      {
        title: "4. Who It Is For",
        body:
          "This cream is a beautiful choice for dry, normal, or comfort-seeking skin types. It also works well for anyone who enjoys richer textures that still feel elegant and refined."
      },
      {
        title: "5. When To Use It",
        body:
          "Use it after serum as the final step of your routine, morning or night. In the daytime it helps skin feel smooth under sunscreen, and at night it adds a more cocooning finish."
      },
      {
        title: "6. Why It Stands Out",
        body:
          "PDRN Cream is ideal for shoppers who want their moisturizer to do more than simply sit on the surface. It gives the skin a smoother, softer, more cared-for look right away."
      },
      {
        title: "7. Layering Tips",
        body:
          "Pair it with PDRN Serum for a complete bounce-focused routine, or wear it after Snail Mucin Serum when your skin is craving extra softness and a fuller veil of moisture."
      },
      {
        title: "8. Daytime Finish",
        body:
          "During the day, the finish looks healthy, supple, and polished. It helps the complexion feel more comfortable without creating a heavy or waxy after-feel."
      },
      {
        title: "9. Evening Ritual",
        body:
          "At night, this formula becomes an especially satisfying final step. A slightly fuller layer can make skin feel deeply replenished and ready for the next morning."
      },
      {
        title: "10. Packaging Details",
        body:
          "The jar is designed to feel clean, feminine, and elevated on a vanity. It pairs a soft pink tone with a simple silhouette that reflects the polished feel of the formula inside."
      }
    ]
  },
  "pdrn-serum": {
    gallery: getLocalProductGallery("pdrn-serum"),
    heroLabel: "HH079 PDRN Serum",
    sections: [
      {
        title: "1. What It Is",
        body:
          "Neatique PDRN Serum is a lightweight daily serum designed to leave skin looking smoother, fresher, and more luminous. It fits easily into both simple routines and more layered skincare rituals."
      },
      {
        title: "2. Texture",
        body:
          "The texture feels silky, fluid, and fast-absorbing. It glides over the skin comfortably and settles without heaviness, leaving behind a hydrated finish that still feels clean and breathable."
      },
      {
        title: "3. Formula Highlights",
        body:
          "This formula is centered around Salmon PDRN and a 5-peptide blend, chosen to support skin that looks tired, uneven, or lacking bounce. Together they help the skin feel cared for and look more refined over time."
      },
      {
        title: "4. Why Customers Love It",
        body:
          "Customers usually reach for this serum when they want a routine step that brings softness, hydration, and a healthy glow. It is especially appealing when skin feels dull, dehydrated, or a little rough in texture."
      },
      {
        title: "5. Who It Is For",
        body:
          "PDRN Serum works well for normal, combination, and dehydrated skin types, and it also layers beautifully for dry skin when followed with a richer cream. It is a great choice for anyone who loves a smooth, radiant finish."
      },
      {
        title: "6. When To Use It",
        body:
          "Use it after cleansing and before moisturizer, morning and night. It slips easily into a routine and gives the skin a soft, hydrated layer before cream or sunscreen."
      },
      {
        title: "7. Daytime Feel",
        body:
          "During the day, the serum helps create a smooth and comfortable base under moisturizer and SPF. The finish looks fresh and healthy rather than oily, which makes it easy to wear every day."
      },
      {
        title: "8. Evening Routine",
        body:
          "At night, it can be layered a little more generously and followed with PDRN Cream or Snail Mucin Cream. This creates a comforting routine that feels replenishing without becoming too heavy."
      },
      {
        title: "9. Finish On Skin",
        body:
          "The finish feels smooth, softly dewy, and polished. Skin looks more rested and refined, making this serum a lovely choice for anyone who likes glow without a sticky after-feel."
      },
      {
        title: "10. Packaging Details",
        body:
          "The 30 mL dropper bottle is easy to use and looks elegant on a vanity. The soft pink design gives the product a delicate, feminine feel while still looking clean, modern, and elevated."
      }
    ]
  },
  "snail-mucin-cream": {
    gallery: getLocalProductGallery("snail-mucin-cream"),
    heroLabel: "HH069 SC93 Snail Mucin Cream",
    sections: [
      {
        title: "1. What It Is",
        body:
          "Neatique Snail Mucin Cream is a comforting daily cream made for skin that loves softness, dewiness, and a more replenished feel. It is designed to bring a smooth, cocooned finish to the routine."
      },
      {
        title: "2. Texture",
        body:
          "The texture feels creamy, supple, and cushiony. It melts in with a gentle slip and leaves skin looking fresh, plush, and well cared for."
      },
      {
        title: "3. Daily Comfort",
        body:
          "This cream is a lovely choice when skin feels dry, stressed, or in need of a calmer-looking finish. It helps the complexion feel more settled and look more hydrated."
      },
      {
        title: "4. Who It Is For",
        body:
          "Snail Mucin Cream is especially appealing for dry, dehydrated, or easily sensitized skin, but anyone who enjoys soft, comforting hydration can enjoy it."
      },
      {
        title: "5. When To Use It",
        body:
          "Use it after serum as your final moisturizing step. It works well during the day for a dewy finish and feels especially soothing as part of a night routine."
      },
      {
        title: "6. Routine Pairing",
        body:
          "It layers beautifully after Snail Mucin Serum for a complete hydration-focused ritual, and it can also be paired with PDRN Serum if you want a softer, more cushioned finish."
      },
      {
        title: "7. Finish On Skin",
        body:
          "The finish looks softly luminous and smooth rather than shiny. Skin appears more relaxed, moisturized, and comfortably wrapped."
      },
      {
        title: "8. Why Customers Reach For It",
        body:
          "Customers tend to love this cream when they want their skincare to feel nurturing and easy. It is the kind of formula that makes the last step of a routine feel indulgent."
      },
      {
        title: "9. Day To Night Use",
        body:
          "In the morning, a lighter layer gives a smooth base before SPF. At night, a fuller layer makes the routine feel richer and more restorative."
      },
      {
        title: "10. Packaging Details",
        body:
          "The packaging feels gentle, polished, and feminine, matching the cream's soft and comforting character. It brings a calm, pretty presence to any skincare shelf."
      }
    ]
  },
  "snail-mucin-serum": {
    gallery: getLocalProductGallery("snail-mucin-serum"),
    heroLabel: "HH068 SE96 Snail Mucin Serum",
    sections: [
      {
        title: "1. What It Is",
        body:
          "Neatique Snail Mucin Serum is a lightweight hydration serum designed to help skin feel smooth, refreshed, and softly dewy. It is easy to use and easy to love as an everyday essential."
      },
      {
        title: "2. Texture",
        body:
          "The texture is fluid, silky, and comfortable on the skin. It spreads quickly and absorbs with a fresh, supple finish that never feels too rich."
      },
      {
        title: "3. Everyday Hydration",
        body:
          "This serum is a great choice for days when skin feels a little dry, rough, or lacking bounce. It helps the complexion feel replenished and look more awake."
      },
      {
        title: "4. Who It Is For",
        body:
          "Snail Mucin Serum works beautifully for normal, dehydrated, and combination skin types, and it is especially nice for anyone who wants hydration without heaviness."
      },
      {
        title: "5. When To Use It",
        body:
          "Apply it after cleansing and before cream, both morning and night. Its light feel makes it a natural fit for simple routines and layered routines alike."
      },
      {
        title: "6. Why It Feels So Easy",
        body:
          "Because the formula is so fluid and layer-friendly, it slips into a routine without effort. It can be the one serum you reach for when you want your skin to feel fresh and cared for."
      },
      {
        title: "7. Best Pairings",
        body:
          "Follow with Snail Mucin Cream for a full comfort-focused routine, or pair it with PDRN Cream if you want to add a richer finish on top."
      },
      {
        title: "8. Daytime Look",
        body:
          "In the morning, the serum gives skin a smooth and hydrated base that feels light under moisturizer or sunscreen. The finish stays soft and clean-looking."
      },
      {
        title: "9. Evening Feel",
        body:
          "At night, it makes the skin feel replenished and calm before cream. It is especially pleasant when you want a routine that feels gentle and uncomplicated."
      },
      {
        title: "10. Packaging Details",
        body:
          "The bottle design feels modern, feminine, and polished, giving the serum a fresh vanity appeal. It reflects the light, easy elegance of the formula inside."
      }
    ]
  }
};

export function getProductStory(slug: string) {
  return productStories[slug] ?? { gallery: [], sections: [] };
}
