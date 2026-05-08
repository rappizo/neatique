import assert from "node:assert/strict";
import test from "node:test";
import {
  buildComicPageImagePrompt,
  selectComicPageImageReferenceImages
} from "../lib/openai-comic";
import type { ComicReferenceImageFile } from "../lib/comic-reference-images";

function makeLongText(seed: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${seed} ${index + 1}.`).join(" ");
}

function referenceImage(input: {
  label: string;
  slug: string;
  bucket: ComicReferenceImageFile["bucket"];
  relativePath: string;
  source?: ComicReferenceImageFile["source"];
}): ComicReferenceImageFile {
  const fileName = input.relativePath.split("/").pop() || "model-sheet.jpg";

  return {
    label: input.label,
    fileName,
    relativePath: input.relativePath,
    bucket: input.bucket,
    slug: input.slug,
    source: input.source || "prompt-required-upload",
    mimeType: "image/jpeg",
    imageUrl: `/${input.relativePath}`,
    sizeBytes: 4,
    whyThisMatters: `${input.label} identity lock.`,
    contentSummary: `${input.label} visual lock.`,
    data: Buffer.from("fake")
  };
}

test("comic page image prompt stays under OpenAI length limit while preserving reference locks", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "Sunscreen Drill",
    episodeSummary: makeLongText("Episode summary keeps continuity context", 220),
    pageNumber: 1,
    panelCount: 5,
    pagePurpose: makeLongText("Page purpose mentions refs/model-sheet.png for legacy cleanup", 120),
    promptPackCopyText: makeLongText("Production prompt cites comic/characters/muci/refs/model-sheet.png", 900),
    referenceNotesCopyText: makeLongText("Reference notes cite refs/model-sheet.png", 420),
    globalGptImage2Notes: makeLongText("Global notes cite model-sheet.png", 420),
    panels: [
      {
        pageNumber: 1,
        panelNumber: 1,
        panelTitle: "Opening",
        storyBeat: makeLongText("Muci enters the sunscreen field", 160),
        promptText: makeLongText("Draw Muci with the model sheet", 180),
        dialogueLines: [{ speaker: "Muci", text: "I brought sunscreen." }]
      }
    ],
    requiredUploads: [
      {
        label: "Muci model sheet",
        slug: "muci",
        bucket: "CHARACTER",
        uploadImageNames: ["model-sheet.png"],
        relativePaths: ["comic/characters/muci/refs/model-sheet.png"],
        whyThisMatters: makeLongText("Identity lock", 120),
        contentSummary: makeLongText("Legacy model-sheet.png should normalize", 120)
      }
    ],
    referenceImages: [
      {
        label: "Muci model sheet",
        fileName: "model-sheet.jpg",
        relativePath: "comic/characters/muci/refs/model-sheet.jpg",
        bucket: "CHARACTER",
        slug: "muci",
        source: "prompt-required-upload",
        mimeType: "image/jpeg",
        imageUrl: "/comic/characters/muci/refs/model-sheet.jpg",
        sizeBytes: 4,
        whyThisMatters: "Muci identity lock.",
        contentSummary: "Muci exact model-sheet reference.",
        data: Buffer.from("fake")
      }
    ],
    characterLocks: [
      {
        slug: "muci",
        name: "Muci",
        role: "Audience surrogate.",
        appearance: makeLongText("Profile MD appearance lock says use refs/model-sheet.png", 220),
        personality: "Curious and warm.",
        speechGuide: "Gentle, concise, curious lines.",
        referenceNotes: makeLongText("Profile MD reference lock says model-sheet.png", 180),
        profileMarkdown: makeLongText("Profile MD source of truth repeats refs/model-sheet.png", 900),
        referenceFiles: [
          {
            label: "Model Sheet",
            fileName: "model-sheet.jpg",
            relativePath: "comic/characters/muci/refs/model-sheet.jpg",
            extension: "jpg"
          }
        ]
      }
    ],
    generationAttempt: 1
  });

  assert.ok(prompt.length <= 30000, `Prompt length ${prompt.length} should stay under 30000.`);
  assert.doesNotMatch(prompt, /model-sheet\.png|refs\/model-sheet\.png/);
  assert.match(prompt, /model-sheet\.jpg/);
  assert.match(prompt, /Profile MD source of truth loaded from database/);
  assert.match(prompt, /Reference image files: model-sheet\.jpg/);
  assert.match(prompt, /CURRENT PAGE CONTENT - HIGHEST PRIORITY/);
  assert.match(prompt, /Muci: "I brought sunscreen\."/);
});

test("comic page image prompt separates Coach Ray from Muci and normalizes legacy pentagonal wording", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "Sunscreen Drill",
    episodeSummary: "Coach Ray drills Muci on sunscreen planning.",
    pageNumber: 5,
    panelCount: 3,
    pagePurpose: "Coach Ray and Muci compare panic with planning.",
    promptPackCopyText:
      "Use exact uploaded model sheets. Coach Ray must stay broad pentagonal and planted. Muci stays the broad squat model-sheet droplet with a subtle near-center reader-left top lean.",
    referenceNotesCopyText:
      "Upload Muci and Coach Ray. Keep Coach Ray's pentagonal authority and Muci's broad squat soft droplet.",
    globalGptImage2Notes:
      "Coach Ray remains broad pentagonal, planted, and authoritative. Muci remains broad, squat, round-lower-half-heavy, and browless.",
    panels: [
      {
        pageNumber: 5,
        panelNumber: 1,
        panelTitle: "Planning",
        storyBeat: "Coach Ray gives the lesson while Muci listens.",
        promptText: "Coach Ray must stay broad pentagonal and Muci stays teardrop.",
        dialogueLines: [
          { speaker: "Coach Ray", text: "Planning beats drama!" },
          { speaker: "Muci", text: "That actually helps." }
        ]
      }
    ],
    requiredUploads: [
      {
        label: "Coach Ray Model Sheet",
        slug: "coach-ray",
        bucket: "CHARACTER",
        uploadImageNames: ["model-sheet.jpg"],
        relativePaths: ["comic/characters/coach-ray/refs/model-sheet.jpg"],
        whyThisMatters: "Coach Ray teaches the reapplication lesson.",
        contentSummary: "Exact Coach Ray pentagonal shape and feet."
      },
      {
        label: "Muci Model Sheet",
        slug: "muci",
        bucket: "CHARACTER",
        uploadImageNames: ["model-sheet.jpg"],
        relativePaths: ["comic/characters/muci/refs/model-sheet.jpg"],
        whyThisMatters: "Muci asks the reader question.",
        contentSummary: "Exact Muci teardrop shape and feet."
      }
    ],
    referenceImages: [
      {
        label: "Coach Ray Model Sheet",
        fileName: "model-sheet.jpg",
        relativePath: "comic/characters/coach-ray/refs/model-sheet.jpg",
        bucket: "CHARACTER",
        slug: "coach-ray",
        source: "prompt-required-upload",
        mimeType: "image/jpeg",
        imageUrl: "/comic/characters/coach-ray/refs/model-sheet.jpg",
        sizeBytes: 4,
        whyThisMatters: "Coach Ray identity lock.",
        contentSummary: "Exact Coach Ray pentagonal shape and feet.",
        data: Buffer.from("fake")
      },
      {
        label: "Muci Model Sheet",
        fileName: "model-sheet.jpg",
        relativePath: "comic/characters/muci/refs/model-sheet.jpg",
        bucket: "CHARACTER",
        slug: "muci",
        source: "prompt-required-upload",
        mimeType: "image/jpeg",
        imageUrl: "/comic/characters/muci/refs/model-sheet.jpg",
        sizeBytes: 4,
        whyThisMatters: "Muci identity lock.",
        contentSummary: "Exact Muci teardrop shape and feet.",
        data: Buffer.from("fake")
      }
    ],
    characterLocks: [
      {
        slug: "coach-ray",
        name: "Coach Ray",
        role: "Sunscreen instructor.",
        appearance: "Broad shield-shaped mascot silhouette, not Muci.",
        personality: "Commanding.",
        speechGuide: "Short commands.",
        referenceNotes:
          "Use refs/model-sheet.jpg. Never borrow Muci's teardrop outline. Never describe Coach Ray as pentagonal.",
        profileMarkdown:
          "# Coach Ray\n\n## Appearance lock\nBroad squat shield-shaped protective mascot, centered shallow top crest, near-vertical sides, broad rounded lower body.",
        referenceFiles: [
          {
            label: "Model Sheet",
            fileName: "model-sheet.jpg",
            relativePath: "comic/characters/coach-ray/refs/model-sheet.jpg",
            extension: "jpg"
          }
        ]
      },
      {
        slug: "muci",
        name: "Muci",
        role: "Audience surrogate.",
        appearance:
          "Broad squat model-sheet droplet with a natural rounded top point and subtle near-center reader-left lean.",
        personality: "Curious.",
        speechGuide: "Plainspoken.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown:
          "# Muci\n\n## Appearance lock\nMuci Model Sheet Exact Lock: broad squat pure-white droplet with a natural rounded top point and subtle near-center reader-left lean.",
        referenceFiles: [
          {
            label: "Model Sheet",
            fileName: "model-sheet.jpg",
            relativePath: "comic/characters/muci/refs/model-sheet.jpg",
            extension: "jpg"
          }
        ]
      }
    ],
    generationAttempt: 1
  });

  assert.doesNotMatch(prompt, /Coach Ray[^.\n]*pentagonal/i);
  assert.doesNotMatch(prompt, /broad pentagonal/i);
  assert.doesNotMatch(prompt, /pentagonal authority/i);
  assert.match(prompt, /Coach Ray anti-drift lock/);
  assert.match(prompt, /Muci vs Coach Ray separation/);
  assert.match(prompt, /Coach Ray keeps the broad squat shield-shaped/);
});

test("comic page image prompt includes similar teardrop separation locks", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "Group Panel",
    episodeSummary: "Several similar teardrop characters compare notes.",
    pageNumber: 1,
    panelCount: 1,
    pagePurpose: "Keep similar black-and-white characters distinct.",
    promptPackCopyText: "Muci, Nia, and Snacri stand together.",
    referenceNotesCopyText: "Use model sheets.",
    globalGptImage2Notes: "Keep silhouettes distinct.",
    panels: [
      {
        pageNumber: 1,
        panelNumber: 1,
        panelTitle: "Lineup",
        storyBeat: "Muci, Nia, and Snacri share a panel.",
        promptText: "Muci is compact, Nia has one angled brow, Snacri leans left.",
        dialogueLines: [{ speaker: "Muci", text: "We look different, right?" }]
      }
    ],
    requiredUploads: [],
    referenceImages: [
      {
        label: "Similar Teardrop Character Comparison",
        fileName: "similar-character-comparison.jpg",
        relativePath: "comic/scenes/similar-character-comparison/refs/similar-character-comparison.jpg",
        bucket: "CAST_COMPARISON",
        slug: "similar-teardrop-character-comparison",
        source: "auto-detected",
        mimeType: "image/jpeg",
        imageUrl: "/comic/scenes/similar-character-comparison/refs/similar-character-comparison.jpg",
        sizeBytes: 4,
        whyThisMatters: "Similar teardrop characters appear together.",
        contentSummary: "Difference map for similar droplet characters.",
        data: Buffer.from("fake")
      },
      {
        label: "Front-View Character Height Reference",
        fileName: "character-height-comparison.jpg",
        relativePath: "comic/scenes/character-height-comparison/refs/character-height-comparison.jpg",
        bucket: "CAST_COMPARISON",
        slug: "comic-character-height-comparison",
        source: "auto-detected",
        mimeType: "image/jpeg",
        imageUrl: "/comic/scenes/character-height-comparison/refs/character-height-comparison.jpg",
        sizeBytes: 4,
        whyThisMatters: "Similar characters appear together.",
        contentSummary: "Height scale chart for Muci, Nia, Snacri, Padaruna, Padarana, and Artrans.",
        data: Buffer.from("fake")
      }
    ],
    characterLocks: [
      {
        slug: "muci",
        name: "Muci",
        role: "Audience surrogate.",
        appearance:
          "Broad squat model-sheet droplet with a natural rounded top point and subtle near-center reader-left lean.",
        personality: "Curious.",
        speechGuide: "Plainspoken.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Muci",
        referenceFiles: []
      },
      {
        slug: "nia",
        name: "Nia",
        role: "Top student.",
        appearance: "Tall sharp pointed teardrop with one angled left brow.",
        personality: "Precise.",
        speechGuide: "Concise.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Nia",
        referenceFiles: []
      },
      {
        slug: "snacri",
        name: "Snacri",
        role: "Quiet observer.",
        appearance: "Fatter left-leaning droplet.",
        personality: "Minimal.",
        speechGuide: "Sparse.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Snacri",
        referenceFiles: []
      }
    ],
    generationAttempt: 1
  });

  assert.match(prompt, /Similar teardrop cast separation lock/);
  assert.match(prompt, /Character height reference lock/);
  assert.match(prompt, /off-canvas production reference only/);
  assert.match(prompt, /Do not draw the chart, scale marks, labels, lineup/);
  assert.match(prompt, /Story intro-card rule/);
  assert.match(prompt, /Never infer intro cards/);
  assert.match(prompt, /Muci and Artrans share the shorter tier/);
  assert.match(prompt, /Nia: about 1\.10x Padaruna/);
  assert.match(prompt, /Snacri: same as Padaruna/);
  assert.match(prompt, /Muci Model Sheet Exact Lock/);
  assert.match(prompt, /Muci\/Nia high-risk model-sheet guardrail/);
  assert.match(prompt, /subtle near-center lean toward reader-left\/Muci's right/);
  assert.match(prompt, /not a sharp Nia point, exaggerated hook, sideways curl, or flopped-over cap/);
  assert.match(prompt, /Muci: exact Muci model-sheet droplet/);
  assert.match(prompt, /Nia: taller and sharper pointed teardrop/);
  assert.match(prompt, /Snacri: fatter quiet droplet/);
  assert.match(prompt, /Snacri eye expression lock/);
  assert.match(prompt, /fully open round black dot eyes with tiny white highlights/);
  assert.match(prompt, /Never draw Snacri with half-lidded eyes/);
  assert.match(prompt, /Similar Teardrop Character Comparison/);
  assert.match(prompt, /Front-View Character Height Reference/);
});

test("comic page image prompt protects Padaruna and Padarana from Snacri head drift", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "The Wrong Handbook",
    episodeSummary: "Snacri joins Padaruna and Padarana in the dorm.",
    pageNumber: 5,
    panelCount: 1,
    pagePurpose: "Keep Padaruna and Padarana pointed while Snacri stays left-leaning.",
    promptPackCopyText: "Padaruna, Padarana, and Snacri stand together.",
    referenceNotesCopyText: "Use model sheets exactly and do not blend head shapes.",
    globalGptImage2Notes: "Keep silhouettes distinct.",
    panels: [
      {
        pageNumber: 5,
        panelNumber: 1,
        panelTitle: "Group Check",
        storyBeat: "Padaruna and Padarana react while Snacri stays quiet.",
        promptText:
          "Padaruna keeps an upright sharp point, Padarana keeps an upright soft point, and Snacri alone leans left.",
        dialogueLines: [{ speaker: "Padaruna", text: "We still look like ourselves." }]
      }
    ],
    requiredUploads: [],
    referenceImages: [],
    characterLocks: [
      {
        slug: "padaruna",
        name: "Padaruna",
        role: "Trend magnet.",
        appearance: "Upright sharp pointed head, fuller round buoyant body.",
        personality: "Energetic.",
        speechGuide: "Fast.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Padaruna",
        referenceFiles: []
      },
      {
        slug: "padarana",
        name: "Padarana",
        role: "Emotional anchor.",
        appearance: "Upright soft pointed head, slimmer gentle body, closed smiling eyes.",
        personality: "Gentle.",
        speechGuide: "Warm.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Padarana",
        referenceFiles: []
      },
      {
        slug: "snacri",
        name: "Snacri",
        role: "Quiet observer.",
        appearance: "Fatter left-leaning quiet droplet.",
        personality: "Minimal.",
        speechGuide: "Sparse.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Snacri",
        referenceFiles: []
      }
    ],
    generationAttempt: 1
  });

  assert.match(prompt, /Padaruna\/Padarana anti-Snacri head lock/);
  assert.match(prompt, /Snacri is the only droplet here with a left-leaning quiet top\/head silhouette/);
  assert.match(prompt, /Padaruna keeps her own upright sharp pointed head/);
  assert.match(prompt, /Padarana keeps her own upright soft pointed head/);
  assert.match(prompt, /never Snacri's left-leaning quiet head\/top/);
  assert.match(prompt, /Snacri's eyes must match the Snacri model sheet/);
  assert.match(prompt, /Do not draw Snacri with half-lidded eyes, sleepy droopy eyes/);
});

test("comic page image prompt locks Artrans to Muci height tier", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "Height Check",
    episodeSummary: "Artrans and Padaruna compare a lab chart.",
    pageNumber: 2,
    panelCount: 1,
    pagePurpose: "Keep character heights stable in a two-character panel.",
    promptPackCopyText: "Artrans stands beside Padaruna on the same ground plane.",
    referenceNotesCopyText: "Use model sheets and the off-canvas height reference.",
    globalGptImage2Notes: "Keep heights stable.",
    panels: [
      {
        pageNumber: 2,
        panelNumber: 1,
        panelTitle: "Scale Check",
        storyBeat: "Artrans and Padaruna stand side by side.",
        promptText: "Draw Artrans and Padaruna standing on the same floor line.",
        dialogueLines: [{ speaker: "Artrans", text: "Scale matters." }]
      }
    ],
    requiredUploads: [],
    referenceImages: [],
    characterLocks: [
      {
        slug: "artrans",
        name: "Artrans",
        role: "Skincare student.",
        appearance: "Muci-height mascot.",
        personality: "Careful.",
        speechGuide: "Concise.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Artrans",
        referenceFiles: []
      },
      {
        slug: "padaruna",
        name: "Padaruna",
        role: "Trend magnet.",
        appearance: "Sharp pointed head, fuller rounder buoyant body.",
        personality: "Energetic.",
        speechGuide: "Fast.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Padaruna",
        referenceFiles: []
      }
    ],
    generationAttempt: 1
  });

  assert.match(prompt, /Character height reference lock/);
  assert.match(prompt, /Artrans: same as Muci/);
  assert.match(prompt, /Padaruna: 1\.00x Padaruna baseline/);
  assert.match(prompt, /Padaruna keeps the existing about-1\.1x-Muci relationship/);
});

test("comic page image prompt reinforces Padaruna and Professor Cera Lin shapes", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "Know Your Barrier or Go Home",
    episodeSummary: "Padaruna joins Barrier Sciences while Professor Cera Lin teaches restraint.",
    pageNumber: 4,
    panelCount: 2,
    pagePurpose: "Keep Padaruna and Professor Cera Lin visually distinct during class comedy.",
    promptPackCopyText: "Draw Padaruna, Muci, and Professor Cera Lin in Barrier Sciences Hall.",
    referenceNotesCopyText: "Use model sheets exactly.",
    globalGptImage2Notes: null,
    panels: [
      {
        pageNumber: 4,
        panelNumber: 1,
        panelTitle: "Bad Idea Pitch",
        storyBeat: "Padaruna pitches a chaotic routine while Professor Cera Lin observes.",
        promptText: "Padaruna and Professor Cera Lin react to Muci.",
        dialogueLines: [{ speaker: "Padaruna", text: "What if faster is prettier?" }]
      }
    ],
    requiredUploads: [
      {
        label: "Muci Model Sheet",
        slug: "muci",
        bucket: "CHARACTER",
        uploadImageNames: ["model-sheet.jpg"],
        relativePaths: ["comic/characters/muci/refs/model-sheet.jpg"],
        whyThisMatters: "Muci identity lock.",
        contentSummary: "Muci model sheet."
      },
      {
        label: "Padaruna Model Sheet",
        slug: "padaruna",
        bucket: "CHARACTER",
        uploadImageNames: ["model-sheet.jpg"],
        relativePaths: ["comic/characters/padaruna/refs/model-sheet.jpg"],
        whyThisMatters: "Padaruna identity lock.",
        contentSummary: "Padaruna model sheet."
      },
      {
        label: "Professor Cera Lin Model Sheet",
        slug: "professor-cera-lin",
        bucket: "CHARACTER",
        uploadImageNames: ["model-sheet.jpg"],
        relativePaths: ["comic/characters/professor-cera-lin/refs/model-sheet.jpg"],
        whyThisMatters: "Professor Cera Lin identity lock.",
        contentSummary: "Professor Cera Lin model sheet."
      }
    ],
    referenceImages: [
      referenceImage({
        label: "Muci Model Sheet",
        slug: "muci",
        bucket: "CHARACTER",
        relativePath: "comic/characters/muci/refs/model-sheet.jpg"
      }),
      referenceImage({
        label: "Padaruna Model Sheet",
        slug: "padaruna",
        bucket: "CHARACTER",
        relativePath: "comic/characters/padaruna/refs/model-sheet.jpg"
      }),
      referenceImage({
        label: "Professor Cera Lin Model Sheet",
        slug: "professor-cera-lin",
        bucket: "CHARACTER",
        relativePath: "comic/characters/professor-cera-lin/refs/model-sheet.jpg"
      })
    ],
    characterLocks: [
      {
        slug: "muci",
        name: "Muci",
        chineseName: null,
        role: "Freshman protagonist",
        appearance: "Broad squat pure-white droplet, no brow by default.",
        personality: "Anxious and sincere.",
        speechGuide: "Plainspoken.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Muci",
        referenceFiles: []
      },
      {
        slug: "padaruna",
        name: "Padaruna",
        chineseName: null,
        role: "Trend magnet",
        appearance:
          "Sharp pointed head, fuller rounder buoyant body, no eyebrows, open lively dot eyes.",
        personality: "Energetic.",
        speechGuide: "Fast and excited.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Padaruna",
        referenceFiles: []
      },
      {
        slug: "professor-cera-lin",
        name: "Professor Cera Lin",
        chineseName: null,
        role: "Barrier Sciences professor",
        appearance: "Rounded six-sided hexagon silhouette.",
        personality: "Precise.",
        speechGuide: "Concise.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Professor Cera Lin",
        referenceFiles: []
      }
    ],
    generationAttempt: 1
  });

  assert.match(prompt, /Padaruna anti-Muci identity lock/);
  assert.match(prompt, /Muci\/Padaruna high-risk size separation/);
  assert.match(prompt, /no eyebrows or brow marks/);
  assert.match(prompt, /about 1\.1x Muci's overall size/);
  assert.match(prompt, /not Muci's squat soft protagonist droplet/);
  assert.match(prompt, /Professor Cera Lin six-sided hexagon shape lock/);
  assert.match(prompt, /exactly six exterior sides and six rounded corners/);
  assert.match(prompt, /not any star shape/);
});

test("comic page image prompt normalizes legacy Professor Cera Lin pentagonal wording", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "Know Your Barrier or Go Home",
    episodeSummary: "Professor Cera Lin teaches a Barrier Sciences exercise.",
    pageNumber: 5,
    panelCount: 1,
    pagePurpose: "Fix legacy wording before image generation.",
    promptPackCopyText:
      "Characters: Muci and Professor Cera Lin. Professor Cera Lin pointed pentagonal. Professor Cera Lin stays pointed pentagonal and composed.",
    referenceNotesCopyText:
      "Professor Cera Lin exact model sheet: pointed pentagonal silhouette, controlled face, pure white fill.",
    globalGptImage2Notes:
      "Keep Professor Cera Lin pointed pentagonal, composed, and precise.",
    panels: [
      {
        pageNumber: 5,
        panelNumber: 1,
        panelTitle: "Exercise Begins",
        storyBeat:
          "Professor Cera Lin keeps her pointed pentagonal composed professor silhouette while teaching.",
        promptText:
          "Professor Cera Lin pointed pentagonal, controlled, speaking beside the board.",
        dialogueLines: [{ speaker: "Professor Cera Lin", text: "Diagnose first." }]
      }
    ],
    requiredUploads: [
      {
        label: "Professor Cera Lin Model Sheet",
        slug: "professor-cera-lin",
        bucket: "CHARACTER",
        uploadImageNames: ["model-sheet.jpg"],
        relativePaths: ["comic/characters/professor-cera-lin/refs/model-sheet.jpg"],
        whyThisMatters: "Needed for her precise pentagonal professor silhouette.",
        contentSummary: "Professor Cera Lin exact model sheet: pointed pentagonal silhouette."
      }
    ],
    referenceImages: [
      referenceImage({
        label: "Professor Cera Lin Model Sheet",
        slug: "professor-cera-lin",
        bucket: "CHARACTER",
        relativePath: "comic/characters/professor-cera-lin/refs/model-sheet.jpg"
      })
    ],
    characterLocks: [
      {
        slug: "professor-cera-lin",
        name: "Professor Cera Lin",
        chineseName: null,
        role: "Barrier Sciences professor",
        appearance: "Rounded six-sided hexagon silhouette.",
        personality: "Precise.",
        speechGuide: "Concise.",
        referenceNotes: "Use refs/model-sheet.jpg.",
        profileMarkdown: "# Professor Cera Lin",
        referenceFiles: []
      }
    ],
    generationAttempt: 1
  });

  assert.doesNotMatch(prompt, /Professor Cera Lin pointed pentagonal/i);
  assert.doesNotMatch(prompt, /pointed pentagonal silhouette/i);
  assert.doesNotMatch(prompt, /precise pentagonal professor silhouette/i);
  assert.match(prompt, /Professor Cera Lin rounded six-sided hexagon/);
  assert.match(prompt, /one rounded central top peak/);
  assert.match(prompt, /flat-topped stop-sign\/octagon/);
});

test("comic page image reference selection keeps similar teardrop comparison during retries", () => {
  const previousLimit = process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES;
  process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES = "4";

  try {
    const selected = selectComicPageImageReferenceImages(
      [
        referenceImage({
          label: "Muci Model Sheet",
          slug: "muci",
          bucket: "CHARACTER",
          relativePath: "comic/characters/muci/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Nia Model Sheet",
          slug: "nia",
          bucket: "CHARACTER",
          relativePath: "comic/characters/nia/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Snacri Model Sheet",
          slug: "snacri",
          bucket: "CHARACTER",
          relativePath: "comic/characters/snacri/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Padaruna Model Sheet",
          slug: "padaruna",
          bucket: "CHARACTER",
          relativePath: "comic/characters/padaruna/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Similar Teardrop Character Comparison",
          slug: "similar-teardrop-character-comparison",
          bucket: "CAST_COMPARISON",
          relativePath: "comic/scenes/similar-character-comparison/refs/similar-character-comparison.jpg",
          source: "auto-detected"
        }),
        referenceImage({
          label: "Front-View Character Height Reference",
          slug: "comic-character-height-comparison",
          bucket: "CAST_COMPARISON",
          relativePath: "comic/scenes/character-height-comparison/refs/character-height-comparison.jpg",
          source: "auto-detected"
        })
      ],
      2
    );

    assert.equal(selected.length, 4);
    assert.ok(selected.some((reference) => reference.slug === "muci"));
    assert.ok(selected.some((reference) => reference.slug === "nia"));
    assert.ok(
      selected.some((reference) => reference.slug === "similar-teardrop-character-comparison"),
      "The comparison sheet should not be dropped when retry mode prioritizes identity references."
    );
    assert.ok(
      selected.some((reference) => reference.slug === "comic-character-height-comparison"),
      "The front-view height reference should not be dropped when retry mode prioritizes identity references."
    );
  } finally {
    if (previousLimit === undefined) {
      delete process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES;
    } else {
      process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES = previousLimit;
    }
  }
});

test("comic page image reference selection keeps cover logo during retries", () => {
  const previousLimit = process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES;
  process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES = "4";

  try {
    const selected = selectComicPageImageReferenceImages(
      [
        referenceImage({
          label: "Muci Model Sheet",
          slug: "muci",
          bucket: "CHARACTER",
          relativePath: "comic/characters/muci/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Nia Model Sheet",
          slug: "nia",
          bucket: "CHARACTER",
          relativePath: "comic/characters/nia/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Snacri Model Sheet",
          slug: "snacri",
          bucket: "CHARACTER",
          relativePath: "comic/characters/snacri/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Padaruna Model Sheet",
          slug: "padaruna",
          bucket: "CHARACTER",
          relativePath: "comic/characters/padaruna/refs/model-sheet.jpg"
        }),
        referenceImage({
          label: "Neatique comic title logo",
          slug: "comic-logo",
          bucket: "BRAND_LOGO",
          relativePath: "/images/comiclogo.png"
        })
      ],
      2
    );

    assert.equal(selected.length, 4);
    assert.ok(
      selected.some((reference) => reference.bucket === "BRAND_LOGO"),
      "The cover logo should not be dropped in retry reference selection."
    );
  } finally {
    if (previousLimit === undefined) {
      delete process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES;
    } else {
      process.env.OPENAI_COMIC_MAX_REFERENCE_IMAGES = previousLimit;
    }
  }
});

test("comic cover image prompt stays dialogue-free with serif title", () => {
  const prompt = buildComicPageImagePrompt({
    projectTitle: "Neatique Skincare College",
    seasonTitle: "Season 1",
    chapterTitle: "Chapter 1",
    episodeTitle: "Welcome to Neatique",
    episodeSummary: "Muci arrives at Neatique for the first time.",
    pageNumber: 0,
    panelCount: 1,
    pagePurpose: "Cover: logo, Episode 1: Welcome to Neatique, and silent interaction.",
    promptPackCopyText: [
      "Create the episode cover page.",
      'Render one centered serif title line exactly: "Episode 1: Welcome to Neatique".',
      "No character dialogue, no speech balloons, no caption boxes, and no SFX.",
      "The cover does not count as any character's first appearance. Do not include character introduction boxes.",
      "Maintain the unified minimalist Japanese manga style."
    ].join("\n"),
    referenceNotesCopyText: "Use the uploaded comiclogo.png brand logo. Keep cover lettering in one serif font.",
    globalGptImage2Notes: "Keep the same minimalist black-and-white manga style.",
    panels: [
      {
        pageNumber: 0,
        panelNumber: 1,
        panelTitle: "Silent cover interaction",
        storyBeat: "Muci silently reacts to the school gate.",
        promptText:
          'Draw a silent cover interaction and render the title line "Episode 1: Welcome to Neatique" in one serif font. Do not add character introduction boxes.',
        dialogueLines: []
      }
    ],
    requiredUploads: [
      {
        label: "Neatique comic title logo",
        slug: "comic-logo",
        bucket: "BRAND_LOGO",
        uploadImageNames: ["comiclogo.png"],
        relativePaths: ["/images/comiclogo.png"],
        whyThisMatters: "Locks the logo.",
        contentSummary: "Exact uploaded logo."
      }
    ],
    referenceImages: [
      referenceImage({
        label: "Neatique comic title logo",
        slug: "comic-logo",
        bucket: "BRAND_LOGO",
        relativePath: "/images/comiclogo.png"
      })
    ],
    characterLocks: [],
    generationAttempt: 1
  });

  assert.match(prompt, /Episode 1: Welcome to Neatique/);
  assert.match(prompt, /serif/i);
  assert.match(prompt, /unified minimalist Japanese manga style/i);
  assert.match(prompt, /Episode 1 cover layout template lock/i);
  assert.match(prompt, /same top logo centerline, logo size, Episode title position/i);
  assert.match(prompt, /same size and position as Episode 1/i);
  assert.match(prompt, /must not be a static lineup/i);
  assert.match(prompt, /distinct expressions, eye-lines, body tilts/i);
  assert.match(prompt, /cover does not count as a character's first appearance/i);
  assert.match(prompt, /Do not draw character introduction boxes/i);
  assert.doesNotMatch(prompt, /Dialogue lines:/);
  assert.doesNotMatch(prompt, /Render every specified dialogue line/);
});
