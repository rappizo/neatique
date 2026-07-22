# Neatique Beauty Tips Article and Image Standard

This is the default production standard for every new `/beauty-tips/` article. It is an editorial checklist, not a reason to add filler. A post should be as long as needed to answer its search question clearly and safely.

## 1. Required page order

1. Category eyebrow, one descriptive H1, excerpt, author, date, review status, and read time.
2. A 16:9 editorial cover image tied to the article's primary product or routine.
3. `In brief`: a direct two- or three-sentence answer that makes sense without reading the rest of the article.
4. `On this page`: generated automatically when the article has at least three H2 sections.
5. The core answer: explain the reader's problem and the practical decision first.
6. Illustrated method or comparison sections: place an image after the concept it clarifies, not as decoration between every paragraph.
7. AM/PM routine or usage sequence where the topic involves product use.
8. Common mistakes, when to simplify, and patch-test or stop-use guidance where relevant.
9. FAQ: three to five visible questions that add new information rather than repeating headings; the page converts this section into matching `FAQPage` structured data.
10. Topic collection, three related Beauty Tips, helpful references, matching product, and the editorial disclaimer.

## 2. Writing and SEO rules

- Write in natural US English for a reader, not for a keyword counter.
- Assign one primary search intent and one focus keyword. Do not publish a second article that answers the same intent without a consolidation plan.
- H1 should state the ingredient or product type plus the user's decision or task. Keep the separate SEO title concise enough to display cleanly in search.
- The excerpt should answer the query in roughly 140–180 characters and work as the `In brief` copy.
- The SEO description should be specific, non-sensational, and normally remain between 140 and 160 characters.
- Use a short lowercase hyphenated slug. Do not include a date unless the article is genuinely time-dependent.
- Link to one topic collection, one primary product, and two or three genuinely related guides with descriptive anchor text.
- Use cosmetic appearance language. Do not diagnose, promise treatment, invent concentrations, infer INCI details, or turn a rinse-off product into a leave-on efficacy claim.
- Cite authoritative sources for washing technique, safety, or other factual guidance. Product facts must match current Neatique packaging or verified manufacturer records.
- Record AI assistance honestly. Any article with health-adjacent guidance remains a draft until a named human editorial review is recorded.

## 3. Content markup

Post content supports paragraphs, `##` headings, `###` headings, bullet lists, inline links, and SEO image blocks.

```md
## Descriptive section heading

Answer the section question in the first sentence.

![Natural, descriptive alt text](/posts/article-slug/descriptive-file-name.webp "A useful caption that adds context instead of repeating the alt text.")
```

Image blocks become responsive `<figure>` elements. Their URLs are also added to the article's structured-data image list. H2 headings receive stable anchors and populate `On this page` automatically.

## 4. Image set per article

Every standard article should have three or four purposeful images:

| Role | Recommended source | Ratio | Web target | Purpose |
| --- | --- | --- | --- | --- |
| Cover | Product-reference editorial image | 16:9 | Up to 1920 px wide, normally under 220 KB | Search/social preview and article hero |
| Texture or detail | Macro product texture or accurate close-up | 3:2 | Up to 1600 px wide, normally under 180 KB | Show what the text is describing |
| Method or routine | Realistic application scene or code-native diagram | 3:2 or 16:9 | Up to 1600 px wide, normally under 180 KB | Make usage order immediately scannable |
| Comparison, optional | Product-reference lineup or code-native comparison | 16:9 | Up to 1600 px wide, normally under 200 KB | Support a purchase or routine decision |

Do not add multiple images that communicate the same idea. Diagrams with exact labels should be built in HTML/CSS or SVG when possible; generated raster images are for photographic, texture, lifestyle, and editorial visuals.

## 5. Image SEO and accessibility

- Final website files use WebP unless transparency genuinely requires another format.
- Use lowercase descriptive filenames: `primary-topic-visual-subject-neatique.webp`.
- Alt text describes the image for someone who cannot see it. Keep it natural, normally 50–125 characters, and mention Neatique or a product name only when that product is visibly present.
- Captions explain why the image matters in the current section. Do not repeat the alt text or add unsupported claims.
- Never place the article title or SEO keywords as baked-in overlay text.
- Cover images load as the page hero; below-the-fold images use responsive sizing and lazy loading through Next Image.
- Keep the important subject inside the center 70% safe area so article, card, and social crops remain usable.
- Generated images containing a person must display the site's `AI-generated person` disclosure.

## 6. Product-reference generation rules

- Use the current real product image as a binding reference whenever packaging is visible.
- Lock tube or bottle shape, cap, color, logo, product name, percentages, volume, and label hierarchy.
- Reject any output with invented letters, an altered concentration, the wrong product, competitor packaging, a second generic bottle, or an inaccurate applicator.
- If packaging text cannot be reproduced accurately, generate a no-packaging texture or application scene instead of publishing the inaccurate packshot.
- Do not generate fake before-and-after results, clinical charts, customer photos, reviews, dermatologist endorsements, or medical outcomes.
- Prompts, alt text, captions, output paths, model, and aspect ratio live in a tracked asset manifest under `content/beauty-tips/`.

## 7. APIYI production workflow

The reusable generator reads `APIYI_API_KEY`, `APIYI_BASE_URL`, and `AI_IMAGE_MODEL` from the environment. It sends one request per distinct asset, converts the returned image to optimized WebP, and prints final dimensions, file size, alt text, and caption for review.

```powershell
npx tsx scripts/generate-beauty-tip-images.ts `
  --manifest content/beauty-tips/article-name.assets.json
```

Use `--only <asset-id>` to validate one image before generating a full set. Existing final files are skipped unless `--force` is supplied. Every generated image must still receive a visual check before it is referenced by an article.

## 8. Pre-publish checklist

- Search intent is distinct from existing posts.
- Title, excerpt, SEO title, SEO description, slug, focus keyword, and secondary keywords are unique.
- Product names, formula facts, directions, and links match current source material.
- Direct answer appears before background explanation.
- All images pass packaging, hands, skin, text, and object checks.
- Every image has a descriptive filename, alt text, caption, dimensions, and optimized file size.
- The post contains collection, product, related-guide, and authoritative reference links.
- FAQ answers are visible on the page and do not make medical claims.
- Article, visible-FAQ, and Breadcrumb structured data validate, and the full image set is present in Article structured data.
- A named human reviewer is recorded before publication when the article includes safety or health-adjacent guidance.
