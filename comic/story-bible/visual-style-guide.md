# Visual Style Guide

## Overall look
- Black-and-white manga only
- Clean Japanese manga linework: crisp black ink on pure white paper
- High-contrast, open, readable panel art with generous white space
- Sparse grayscale screentone, hatching, manga shadow shapes, and simple white highlight space only where needed
- Soft rounded silhouettes
- Friendly mascot readability
- Campus-comedy warmth with mystery undertones
- Expressions should be simple, readable, and scalable from chibi reactions to more cinematic framing
- Do not use full color, colored accents, painterly color lighting, or rendered color palettes for final comic pages
- Do not use gray wash, muddy charcoal shading, smoky overlays, or heavy airbrush texture.

## Character consistency rules
- Always keep each character's silhouette stable before adding emotion.
- Characters must be recognizable even in silhouette-only poses.
- Model-sheet reference images are the top authority for body shape, face placement, eye style, highlight marks, proportions, small feet/lower-body nubs, and point direction.
- Treat model sheets as exact identity locks, not loose inspiration.
- Do not let random prompts "average out" the cast into the same droplet.
- Every character is a handless mascot being with no arms, hands, fingers, paws, gloves, sleeves, wrists, elbows, or humanoid upper limbs.
- Every character has small rounded feet or foot nubs in full-body views.
- Preserve every character's feet, lower body nubs, base shape, or tiny legs exactly as shown in the character's model sheet.
- Droplet characters normally have exactly two small connected feet/foot nubs in full-body views. Never add a third foot, extra leg nub, shoe, toe, paw, or detached lower appendage.
- Leave clear lower-frame space in full-body shots so the small feet or foot nubs remain visible; never crop through the feet.
- Character body interiors must stay pure white like the concept/model sheets. Do not fill mascot bodies with gray, gradients, screentone, or shadow haze.
- If a beat needs an object moved, use telekinetic object movement instead of hands.

## Fixed shape language
- **Permanent lean-direction lock**: Muci and Snacri must never swap lean directions. In primary front/3/4 reader-facing appearances, Muci always reads as the left-leaning droplet (top leans toward reader-left/page-left), while Snacri always reads as the right-leaning droplet (head/top leans toward reader-right/page-right). Do not mirror them from panel to panel unless the story explicitly calls for a true back/side view; for normal readable appearances, keep this direction consistent.
- **Artrans**: cream-swirl silhouette, layered spiral volume, half-lidded eyes, sly sleepy face
- **Muci**: exact match to Muci model sheet; broad squat pure-white droplet mascot with a round heavy lower half, low center of gravity, soft bulging sides, curved rounded base, natural rounded teardrop point with a consistent reader-left/page-left lean, two attached small rounded feet, large black dot eyes with tiny catchlights, small friendly U-smile, oval-plus-dot glossy highlights on upper reader-left, no brow by default, cute approachable protagonist energy; never right-leaning
- **Nia**: taller teardrop with the sharpest vertical point, one angled left brow, controlled confident smile, composed analytical confidence
- **Padarana**: slimmer soft pointed teardrop with an upright pointed head, closed smiling eyes, calm reassuring mouth, emotional warmth; never borrow Snacri's right-leaning quiet head/top
- **Padaruna**: very sharp upright centered pointed head with a cute plump/chubby, full rounded, buoyant pear-bottom body and softer wider lower belly than Padarana; her lower half must read visibly wider, rounder, heavier, and softer than her upper body, with a broad cute base under the sharp head. No eyebrows, no side nubs or arm-like protrusions, energetic openness, highly expressive open dot eyes and eager smile; do not let her become skinny, narrow, tall-stretched, delicate, Nia's tall narrow controlled droplet, Muci's squat soft protagonist droplet, or Snacri's right-leaning quiet head/top; when she appears with Muci, Padaruna should read about 1.1x Muci's overall body scale
- **Snacri**: fatter quiet droplet with the head/top leaning right, understated asymmetry, minimalist restrained read, fully open round black dot eyes with tiny white highlights, restrained tiny smile, exactly two small connected feet in full-body views; never half-lidded, sleepy, droopy, slanted, annoyed, or browed eyes; never left-leaning like Muci
- **Sunny Spritz**: soft five-point star silhouette, two small rounded feet directly under the lower star points, bright open smile, orientation-host energy
- **Coach Ray**: broad squat shield-shaped mascot silhouette matching the uploaded model-sheet reference, centered shallow top crest, firm upper shoulders, near-vertical sides, broad rounded lower body, planted authority, drill-instructor read; never draw him as Muci, a teardrop, or a generic polygon mascot
- **Mira Mistwell**: rounded-square silhouette, neat balance, quiet administrative authority
- **Professor Cera Lin**: model-sheet rounded six-sided hexagon silhouette with one rounded central top peak, two sloped upper sides, two vertical side walls, rounded lower base, exactly six exterior sides and six rounded corners, controlled posture, academic precision; never draw her as any star shape, a five-point star, a six-point star, a flat-topped stop-sign/octagon, or Sunny Spritz's soft star
- **Dewey Dot**: clean circular silhouette, bookish gentleness, archive-first energy
- **Vela Sheen**: elegant diamond silhouette, refined balance, polished upperclass composure

## Camera language
- Comedy scenes can use slightly exaggerated campus framing, reaction panels, and rhythm-based cutaways.
- Mystery scenes should feel more composed: deeper hallways, archive framing, side glances, rule boards, and hidden details.
- Group scenes should preserve silhouette readability and not let one character block the iconic profile of another.

## Color and lighting logic
- Final comic pages are black-and-white manga pages, so lighting is expressed through line weight, screentone density, hatching, white space, and shadow shape.
- Character bodies, especially Muci, should remain pure white with clean black outlines. Put mood tone in backgrounds, cast shadows, panel framing, and small accents instead of filling characters gray.
- The core comic world should support warm daylight campus scenes, calm dorm interiors, cool archive spaces, and controlled lab lighting through grayscale value design only.
- Villain-adjacent or "Glow Standard" scenes can look cleaner, colder, and more over-optimized through sharper contrast and more controlled panel geometry, not color.
- Emotional repair scenes should feel softer and more breathable through lighter screentone, open white space, and gentler linework.

## Prompting rules for gpt-image-2
- Start every page prompt with clean high-contrast black-and-white manga only, no color, no gray wash.
- Always upload the relevant model sheet(s) for every speaking character in the panel.
- When multiple droplets appear in one panel, call out each silhouette explicitly by name.
- Keep line style, face placement, small feet/lower-body nubs, and body proportions consistent with the provided references.
- State that character bodies must have pure white fill like the model sheets.
- State that all characters have no hands or arms.
- State that every full-body character must show small feet or lower-body nubs exactly as shown in the model sheet.
- Include a lower-frame foot visibility check in every full-body prompt so feet are not cropped away.
- For Sunny Spritz, explicitly preserve two small rounded feet directly under her soft five-point star body whenever she appears full-body.
- Translate holding, pointing, grabbing, opening, carrying, writing, pushing, or handing something over into telekinetic object movement with floating objects, motion lines, or subtle manga emphasis marks.
- For Muci, explicitly repeat the Muci Model Sheet Exact Lock whenever he appears: broad squat pure-white droplet, round heavy lower half, natural rounded top point with a consistent reader-left/page-left lean, never right-leaning, never an exaggerated hook or sideways curl, curved rounded base, two attached small rounded feet, pure white body fill, large black dot eyes with catchlights, small friendly U-smile, upper reader-left oval-plus-dot highlights, and no brow by default.
- For Nia, explicitly preserve the taller sharper vertical point and one angled left brow whenever she appears.
- For Snacri, explicitly preserve the fatter right-leaning quiet droplet silhouette, fully open round black dot eyes with tiny highlights, restrained tiny smile, and minimal calm expression whenever she appears. Snacri must not have half-lidded eyes, sleepy droopy eyes, eyelids, narrowed side-eye, angled angry eyes, brows, tired/unimpressed expression lines, or Muci's left-leaning top.
- For Padaruna, explicitly preserve the very sharp upright centered pointed head, cute plump/chubby full rounded lively pear-bottom body, soft wide lower belly, visibly heavier rounded lower half, no side nubs or arm-like protrusions, no eyebrows, open dot eyes, and eager smile whenever she appears. When she appears with Nia, state that Padaruna is not Nia: Nia is taller, narrower, controlled, browed, and more vertical, while Padaruna stays browless, lively, lower-heavy, wide-bellied, and rounder at the base. When she appears with Muci, state that Padaruna is not Muci: she is about 1.1x Muci's overall body scale, keeps the sharper head and round buoyant energetic body, while Muci stays short, squat, soft-sided, and protagonist-friendly. When she appears with Snacri, state that Padaruna is not Snacri: Padaruna keeps a very sharp upright centered point and chubby rounded body, while Snacri alone keeps the right-leaning quiet top.
- For Padarana, explicitly preserve the slimmer soft pointed body, upright pointed head, closed smiling eyes, calm reassuring mouth, and gentle presence whenever she appears. When she appears with Snacri, state that Padarana is not Snacri: Padarana keeps an upright soft point, while Snacri alone keeps the right-leaning quiet top.
- When two or more of Muci, Nia, Snacri, Padaruna, and Padarana appear together, use the similar-character comparison reference and state their silhouette differences before describing acting.
- When two or more of Muci, Artrans, Padaruna, Padarana, Snacri, and Nia appear together, use the front-view height reference only as invisible production guidance. Never ask the image model to draw a height chart, scale marks, labels, lineup, or comparison diagram inside a story panel.
- Height tiers must not stretch cute droplet proportions: Muci and Artrans share the shorter tier; Padaruna, Padarana, and Snacri share the standard tier; Nia is only about 1.1x Padaruna.
- When Muci and Nia appear together, treat them as a high-risk pair: draw Muci from the Muci model sheet first, with the consistent reader-left/page-left top lean from the sheet, broad squat body, round heavy lower half, friendly U-smile, upper reader-left highlights, and no brow. Draw Nia separately as taller, narrower, sharply vertical, controlled, and marked by one angled left brow. If Muci's top becomes a sharp Nia-like point, a right-leaning Snacri-like point, or an over-leaning hook/curl, redraw Muci before adding acting or background detail.
- For Coach Ray, explicitly repeat the broad squat shield-shaped body, centered shallow top crest, firm upper shoulders, near-vertical sides, broad rounded lower body, pure white body fill, small connected feet, controlled smile, and planted drill-instructor posture whenever he appears.
- When Muci and Coach Ray appear together, state that their silhouettes must not be averaged: Muci stays the broad squat model-sheet droplet with a consistent reader-left/page-left top lean, while Coach Ray stays a broad protective shield.
- For Professor Cera Lin, explicitly preserve the model-sheet rounded six-sided hexagon body whenever she appears: one rounded central top peak, two sloped upper sides, two vertical side walls, rounded lower base, exactly six exterior sides and six rounded corners. Never draw her as any star shape, a five-point star, a six-point star, pentagon, flat-topped stop-sign/octagon, Sunny Spritz-style soft star, or generic polygon.
- Mention mood, camera angle, and scene function, but do not let style flourishes override character-lock consistency.
- If a panel depends on a specific reaction, include the exact expression target in the prompt and mention which reference sheet to upload.

## Things to avoid
- Color pages or colored accents
- Gray wash, muddy gray pages, gray-filled character bodies, over-toned characters, or smoky charcoal rendering
- Turning every character into the same generic teardrop
- Turning Coach Ray into Muci, a water-drop character, a generic polygon mascot, or a soft rounded blob
- Stretching Muci into a tall narrow droplet, sharp Nia-like point, exaggerated hooked top, sideways curl, or long pear shape
- Snacri drifting into half-lidded, sleepy, droopy, slanted, annoyed, browed, or tired-looking eyes instead of the model-sheet round black dot eyes
- Muci and Snacri swapping lean directions, Muci drifting right, or Snacri drifting left
- Over-rendering that loses mascot simplicity
- Random costume or accessory drift
- Hyper-real textures that fight the comic line language
- "Cute" poses that break the character's established personality rhythm
- Any arms, hands, fingers, paws, gloves, sleeves, wrists, elbows, or humanoid upper limbs
- Removing Muci's two small rounded feet in full-body views
- Removing Sunny Spritz's small rounded feet in full-body views
- Cropping a full-body character at the lower edge so the feet disappear
- Adding a third foot, extra leg nub, shoe, toe, paw, or detached lower appendage to any droplet character
- Muci redesigns, over-leaning Muci top points, shifted highlight marks, animal-like features, humanoid bodies, Nia-like brows, or altered droplet proportions
- Padaruna or Padarana borrowing Snacri's right-leaning quiet head/top, losing their own upright pointed heads, Padaruna losing her very sharp upright point or cute plump/chubby full rounded lower-heavy pear-bottom body, Padaruna becoming skinny, narrow, tall-stretched, delicate, Nia-shaped, Muci's squat soft protagonist droplet, Padaruna eyebrows, or a generic rounded drop with no sharp head
- Professor Cera Lin drifting into any star shape, five-point star, six-point star, pentagon, flat-topped stop-sign/octagon, Sunny Spritz-style soft star, generic polygon, or any flat-top shape instead of the model-sheet single rounded top peak

## Dialogue voice locks
- **Sunny Spritz**: hyper-enthusiastic, fast, cheerful, orientation-host energy, many exclamation marks
- **Coach Ray**: loud, short, commanding, drill-instructor style, slogan-like lines
- **Mira Mistwell**: soft, polite, calm, gently firm, rule-enforcing without sounding angry
- **Professor Cera Lin**: precise, dry, controlled, academic, concise, challenges vague thinking
- **Dewey Dot**: nervous, nerdy, trivia-heavy, hesitant at first, rambly when excited
- **Vela Sheen**: polished, elegant, persuasive, warm on the surface, subtly controlling underneath
