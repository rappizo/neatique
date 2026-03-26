import { getLocalProductGallery } from "@/lib/product-media";

export type ProductStorySection = {
  title: string;
  body: string;
};

type ProductStory = {
  gallery: string[];
  heroLabel?: string;
  sections: ProductStorySection[];
};

export const productStories: Record<string, ProductStory> = {
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
