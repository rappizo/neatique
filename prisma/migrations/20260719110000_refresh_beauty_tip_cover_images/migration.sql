UPDATE "Post"
SET
  "coverImageUrl" = CASE "slug"
    WHEN 'body-cream-for-dry-skin' THEN '/posts/dry-skin-body-cream-neatique-bee-venom.webp'
    WHEN 'brightening-cream-for-even-looking-glow' THEN '/posts/brightening-cream-neatique-at13.webp'
    WHEN 'how-to-use-an-nad-peptide-serum-in-an-am-to-pm-skincare-routine' THEN '/posts/nad-peptide-serum-am-pm-routine.webp'
    WHEN 'how-to-use-pdrn-cream-for-a-calm-hydrated-skin-routine' THEN '/posts/pdrn-cream-hydrated-skin-routine.webp'
    WHEN 'how-to-use-snail-mucin-serum-hydration-routine' THEN '/posts/snail-mucin-serum-hydration-routine.webp'
    WHEN 'how-to-use-tranexamic-serum-even-looking-complexion' THEN '/posts/tranexamic-serum-even-looking-skin.webp'
    WHEN 'niacinamide-tranexamic-serum-for-uneven-looking-tone' THEN '/posts/niacinamide-tranexamic-serum-uneven-tone.webp'
    WHEN 'pdrn-peptide-serum-guide-smooth-hydrated-skin' THEN '/posts/pdrn-peptide-serum-hydration-guide.webp'
    WHEN 'serum-vs-cream-routine-order' THEN '/posts/serum-before-cream-neatique-routine.webp'
    WHEN 'snail-mucin-cream-moisturizer-routine' THEN '/posts/snail-mucin-cream-moisturizer-routine.webp'
    WHEN 'snail-mucin-routine-for-dry-skin' THEN '/posts/snail-mucin-routine-neatique-serum-cream.webp'
    WHEN 'what-is-pdrn-skincare' THEN '/posts/pdrn-skincare-guide-neatique-serum-cream.webp'
    WHEN 'what-to-look-for-in-a-barrier-repair-cream-for-dry-dehydrated-skin' THEN '/posts/barrier-repair-cream-dry-dehydrated-skin.webp'
    ELSE "coverImageUrl"
  END,
  "coverImageAlt" = CASE "slug"
    WHEN 'body-cream-for-dry-skin' THEN 'Neatique Bee Venom and Hyaluronic Acid body cream with rich cream texture for dry skin.'
    WHEN 'brightening-cream-for-even-looking-glow' THEN 'Neatique AT13 arbutin and tranexamic cream arranged with a smooth cream texture on blush stone.'
    WHEN 'how-to-use-an-nad-peptide-serum-in-an-am-to-pm-skincare-routine' THEN 'Neatique NAD+ collagen peptide serum in warm morning-to-evening editorial lighting.'
    WHEN 'how-to-use-pdrn-cream-for-a-calm-hydrated-skin-routine' THEN 'Neatique PDRN Pink Collagen Capsule Cream with moisture beads in a calm blush routine setting.'
    WHEN 'how-to-use-snail-mucin-serum-hydration-routine' THEN 'Neatique SE96 snail mucin serum with translucent hydrating essence on warm ivory stone.'
    WHEN 'how-to-use-tranexamic-serum-even-looking-complexion' THEN 'Neatique TNV3 tranexamic acid serum with clear serum droplets on pale rose glass.'
    WHEN 'niacinamide-tranexamic-serum-for-uneven-looking-tone' THEN 'Neatique NT16+ niacinamide and tranexamic serum in a coral and ivory editorial setting.'
    WHEN 'pdrn-peptide-serum-guide-smooth-hydrated-skin' THEN 'Neatique PDRN5+ peptide serum with moisture droplets and soft pink reflections.'
    WHEN 'serum-vs-cream-routine-order' THEN 'Neatique NAD+ serum and face cream with serum and cream textures illustrating routine order.'
    WHEN 'snail-mucin-cream-moisturizer-routine' THEN 'Neatique SC93 snail mucin cream with a plush cream swirl and gold spatula.'
    WHEN 'snail-mucin-routine-for-dry-skin' THEN 'Neatique 96% snail mucin serum and 93% snail mucin cream in a warm hydration routine setting.'
    WHEN 'what-is-pdrn-skincare' THEN 'Neatique PDRN serum and PDRN cream arranged with hydrating textures on a blush stone vanity.'
    WHEN 'what-to-look-for-in-a-barrier-repair-cream-for-dry-dehydrated-skin' THEN 'Neatique PDRN cream with a rich cream ribbon in a soft barrier-comfort routine setting.'
    ELSE "coverImageAlt"
  END,
  "coverImageData" = NULL,
  "coverImageMimeType" = 'image/webp',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN (
  'body-cream-for-dry-skin',
  'brightening-cream-for-even-looking-glow',
  'how-to-use-an-nad-peptide-serum-in-an-am-to-pm-skincare-routine',
  'how-to-use-pdrn-cream-for-a-calm-hydrated-skin-routine',
  'how-to-use-snail-mucin-serum-hydration-routine',
  'how-to-use-tranexamic-serum-even-looking-complexion',
  'niacinamide-tranexamic-serum-for-uneven-looking-tone',
  'pdrn-peptide-serum-guide-smooth-hydrated-skin',
  'serum-vs-cream-routine-order',
  'snail-mucin-cream-moisturizer-routine',
  'snail-mucin-routine-for-dry-skin',
  'what-is-pdrn-skincare',
  'what-to-look-for-in-a-barrier-repair-cream-for-dry-dehydrated-skin'
);
