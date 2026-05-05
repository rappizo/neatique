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
- Leave clear lower-frame space in full-body shots so the small feet or foot nubs remain visible; never crop through the feet.
- Character body interiors must stay pure white like the concept/model sheets. Do not fill mascot bodies with gray, gradients, screentone, or shadow haze.
- If a beat needs an object moved, use telekinetic object movement instead of hands.

## Fixed shape language
- **Artrans**: cream-swirl silhouette, layered spiral volume, half-lidded eyes, sly sleepy face
- **Muci**: exact match to Muci model sheet; broad squat pure-white droplet mascot with a round heavy lower half, low center of gravity, soft bulging sides, curved rounded base, rounded hooked top tip offset toward reader-left/Muci's right, two attached small rounded feet, large black dot eyes with tiny catchlights, small friendly U-smile, oval-plus-dot glossy highlights on upper reader-left, no brow by default, cute approachable protagonist energy
- **Nia**: taller teardrop with the sharpest vertical point, one angled left brow, controlled confident smile, composed analytical confidence
- **Padarana**: slimmer soft pointed teardrop, closed smiling eyes, calm reassuring mouth, emotional warmth
- **Padaruna**: sharp pointed head with a noticeably fuller rounder body than Padarana, energetic openness, highly expressive open eyes and eager smile
- **Snacri**: fatter quiet droplet with the top leaning left, understated asymmetry, minimalist restrained read
- **Sunny Spritz**: soft five-point star silhouette, two small rounded feet directly under the lower star points, bright open smile, orientation-host energy
- **Coach Ray**: broad squat shield-shaped mascot silhouette matching the uploaded model-sheet reference, centered shallow top crest, firm upper shoulders, near-vertical sides, broad rounded lower body, planted authority, drill-instructor read; never draw him as Muci, a teardrop, or a generic polygon mascot
- **Mira Mistwell**: rounded-square silhouette, neat balance, quiet administrative authority
- **Professor Cera Lin**: pointed pentagonal silhouette, controlled posture, academic precision
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
- For Muci, explicitly repeat the Muci Model Sheet Exact Lock whenever he appears: broad squat pure-white droplet, round heavy lower half, rounded hooked top tip offset toward reader-left/Muci's right, never a centered vertical spike, curved rounded base, two attached small rounded feet, pure white body fill, large black dot eyes with catchlights, small friendly U-smile, upper reader-left oval-plus-dot highlights, and no brow by default.
- For Nia, explicitly preserve the taller sharper vertical point and one angled left brow whenever she appears.
- For Snacri, explicitly preserve the fatter left-leaning quiet droplet silhouette and restrained minimal expression whenever she appears.
- For Padaruna, explicitly preserve the sharp pointed head, fuller rounder lively body, open eyes, and eager smile whenever she appears.
- For Padarana, explicitly preserve the slimmer soft pointed body, closed smiling eyes, calm reassuring mouth, and gentle presence whenever she appears.
- When two or more of Muci, Nia, Snacri, Padaruna, and Padarana appear together, use the similar-character comparison reference and state their silhouette differences before describing acting.
- When Muci and Nia appear together, treat them as a high-risk pair: draw Muci from the Muci model sheet first, with the rounded hooked top offset toward reader-left/Muci's right, broad squat body, round heavy lower half, friendly U-smile, upper reader-left highlights, and no brow. Draw Nia separately as taller, narrower, sharply vertical, controlled, and marked by one angled left brow. If Muci's top is centered, vertical, sharp, or Nia-like, redraw Muci before adding acting or background detail.
- For Coach Ray, explicitly repeat the broad squat shield-shaped body, centered shallow top crest, firm upper shoulders, near-vertical sides, broad rounded lower body, pure white body fill, small connected feet, controlled smile, and planted drill-instructor posture whenever he appears.
- When Muci and Coach Ray appear together, state that their silhouettes must not be averaged: Muci stays the broad squat model-sheet droplet with a rounded hooked reader-left top tip, while Coach Ray stays a broad protective shield.
- Mention mood, camera angle, and scene function, but do not let style flourishes override character-lock consistency.
- If a panel depends on a specific reaction, include the exact expression target in the prompt and mention which reference sheet to upload.

## Things to avoid
- Color pages or colored accents
- Gray wash, muddy gray pages, gray-filled character bodies, over-toned characters, or smoky charcoal rendering
- Turning every character into the same generic teardrop
- Turning Coach Ray into Muci, a water-drop character, a generic polygon mascot, or a soft rounded blob
- Stretching Muci into a tall narrow droplet, centered vertical spike, sharp Nia-like point, or long pear shape
- Over-rendering that loses mascot simplicity
- Random costume or accessory drift
- Hyper-real textures that fight the comic line language
- "Cute" poses that break the character's established personality rhythm
- Any arms, hands, fingers, paws, gloves, sleeves, wrists, elbows, or humanoid upper limbs
- Removing Muci's two small rounded feet in full-body views
- Removing Sunny Spritz's small rounded feet in full-body views
- Cropping a full-body character at the lower edge so the feet disappear
- Muci redesigns, centered or vertical Muci top points, shifted highlight marks, animal-like features, humanoid bodies, Nia-like brows, or altered droplet proportions

## Dialogue voice locks
- **Sunny Spritz**: hyper-enthusiastic, fast, cheerful, orientation-host energy, many exclamation marks
- **Coach Ray**: loud, short, commanding, drill-instructor style, slogan-like lines
- **Mira Mistwell**: soft, polite, calm, gently firm, rule-enforcing without sounding angry
- **Professor Cera Lin**: precise, dry, controlled, academic, concise, challenges vague thinking
- **Dewey Dot**: nervous, nerdy, trivia-heavy, hesitant at first, rambly when excited
- **Vela Sheen**: polished, elegant, persuasive, warm on the surface, subtly controlling underneath
