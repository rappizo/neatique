export const AI_GENERATED_PERSON_LABEL = "AI-generated person";

const AI_GENERATED_PERSON_IMAGE_KEYS = [
  "blog/PDRN Guide.png",
  "blog/Snail Routine.png",
  "home-banner/1-mobile.jpg",
  "home-banner/1.jpg",
  "home-banner/6-mobile.jpg",
  "home-banner/6.jpg",
  "home-banner/8-mobile.jpg",
  "home-banner/8.jpg",
  "home/Application Close-UP-desktop.webp",
  "home/Application Close-UP-mobile.webp",
  "home/Application Close-UP.png",
  "home/Brand Lifestyle Moment.png",
  "HH049 Bee Venom Optimized/3.webp",
  "HH049 Bee Venom Optimized/5.webp",
  "HH049 Bee Venom Optimized/6.webp",
  "HH049 Bee Venom Optimized/8.webp",
  "HH060 TNV3 10% Tranexamic Acid + 2% Nicotinamide Secrum/5.png",
  "HH060 TNV3 10% Tranexamic Acid + 2% Nicotinamide Secrum/6.png",
  "HH060 TNV3 10% Tranexamic Acid + 2% Nicotinamide Secrum/8.png",
  "HH061 AT13 8% Arbutin + 5% Tranexamic Cream/02.png",
  "HH061 AT13 8% Arbutin + 5% Tranexamic Cream/03.png",
  "HH061 AT13 8% Arbutin + 5% Tranexamic Cream/05.png",
  "HH067 NT16 11% Niacinamide + 5% Tranexamic Serum/02.jpg",
  "HH067 NT16 11% Niacinamide + 5% Tranexamic Serum/03.jpg",
  "HH067 NT16 11% Niacinamide + 5% Tranexamic Serum/05.jpg",
  "HH067 NT16 11% Niacinamide + 5% Tranexamic Serum/06.jpg",
  "HH068 SE96 Snail Mucin Serum/2.png",
  "HH068 SE96 Snail Mucin Serum/5.png",
  "HH068 SE96 Snail Mucin Serum/6.png",
  "HH068 SE96 Snail Mucin Serum/7.png",
  "HH069 SC93 Snail Mucin Cream/3.png",
  "HH069 SC93 Snail Mucin Cream/5.png",
  "HH074 KIT9+ Optimized/5.webp",
  "HH074 KIT9+ Optimized/6.webp",
  "HH074 KT9+/5.png",
  "HH074 KT9+/6.png",
  "HH075 PDRN Cream/5.png",
  "HH076 NAD+ Collagen Peptide Serum Optimized/5.webp",
  "HH076 NAD+ Collagen Peptide Serum Optimized/6.webp",
  "HH079 PDRN Serum/4.png",
  "HH079 PDRN Serum/5.png",
  "HH079 PDRN Serum/7.png",
  "HH079 PDRN Serum/LP4.jpg",
  "HH079 PDRN Serum/LP5.jpg",
  "posts/how-to-layer-pdrn-serum-and-cream-without-pilling/pdrn-serum-cream-press-and-smooth-neatique.webp",
  "posts/how-to-use-pdrn-cleanser-without-tightness/pdrn-cleanser-lukewarm-water-fingertips-neatique.webp"
].map(normalizeImageKey);

function decodeUrl(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeImageKey(value: string) {
  return decodeUrl(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isAiGeneratedPersonImage(src?: string | null) {
  if (!src) {
    return false;
  }

  const normalizedSrc = normalizeImageKey(src);
  return AI_GENERATED_PERSON_IMAGE_KEYS.some((key) => normalizedSrc.includes(key));
}
