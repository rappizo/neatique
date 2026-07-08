import { prisma } from "@/lib/db";
import type { AdminReviewPersonaPageRecord, ReviewPersonaRecord } from "@/lib/types";

const seededPersonaNames = [
  "Alicia Morgan",
  "Brooke Bennett",
  "Camille Rivera",
  "Dana Patel",
  "Elena Brooks",
  "Farah Nguyen",
  "Gabrielle Foster",
  "Hannah Kim",
  "Iris Coleman",
  "Jasmine Price",
  "Kendra Wallace",
  "Leah Martinez",
  "Maya Chen",
  "Naomi Reed",
  "Olivia Parker",
  "Priya Shah",
  "Quinn Harper",
  "Riley Thompson",
  "Sabrina Hughes",
  "Tessa Bryant",
  "Uma Desai",
  "Vivian Scott",
  "Whitney Hayes",
  "Ximena Torres",
  "Yara Collins",
  "Zoe Mitchell",
  "Amelia Grant",
  "Brianna Lopez",
  "Celeste Ward",
  "Daphne Kelly",
  "Elise Morgan",
  "Fiona Reed",
  "Grace Nelson",
  "Helena Cruz",
  "Isabel Foster",
  "Jade Simmons",
  "Karina Brooks",
  "Lena Hughes",
  "Marisol Vega",
  "Nora Jenkins",
  "Paige Russell",
  "Renata Diaz",
  "Serena Collins",
  "Talia Bryant",
  "Valerie Hayes",
  "Wendy Carter",
  "Anika Rao",
  "Bethany Price",
  "Clara Myers",
  "Diana Long",
  "Evelyn Ward",
  "Fatima Ali",
  "Gianna Rivera",
  "Hazel Coleman",
  "Imani Brooks",
  "Julia Kim",
  "Keisha Morgan",
  "Lillian Foster",
  "Mei Lin",
  "Natalie Reed",
  "Opal Bennett",
  "Paloma Torres",
  "Rachel Hayes",
  "Simone Parker",
  "Theresa Kelly",
  "Vanessa Bryant",
  "Willow Price",
  "Ariana Scott",
  "Bianca Hughes",
  "Caroline Reed",
  "Danielle Foster",
  "Esme Rivera",
  "Frances Ward",
  "Genevieve Brooks",
  "Heather Coleman",
  "Ingrid Nelson",
  "Jocelyn Myers",
  "Kiara Diaz",
  "Lauren Mitchell",
  "Monica Carter",
  "Nadia Ali",
  "Phoebe Russell",
  "Regina Long",
  "Selena Grant",
  "Tamara Bennett",
  "Vera Collins",
  "Adriana Lopez",
  "Brenda Vega",
  "Cecilia Cruz",
  "Delia Simmons",
  "Erica Jenkins",
  "Florence Kelly",
  "Georgia Ward",
  "Hope Carter",
  "Janessa Bryant",
  "Kayla Price",
  "Lucia Torres",
  "Miranda Hayes",
  "Noelle Scott",
  "Patricia Foster"
];

const defaultReviewPersonaCount = 500;

const additionalFirstNames = [
  "Aaliyah",
  "Addison",
  "Alana",
  "Alexandra",
  "Alina",
  "Alyssa",
  "Amina",
  "Amira",
  "Andrea",
  "Angelica",
  "Asha",
  "Audrey",
  "Aurora",
  "Beatrice",
  "Camila",
  "Carmen",
  "Cassidy",
  "Celine",
  "Chelsea",
  "Christina",
  "Clarissa",
  "Colette",
  "Dahlia",
  "Daisy",
  "Eden",
  "Elaine",
  "Emilia",
  "Estelle",
  "Eva",
  "Felicia",
  "Gabriela",
  "Gemma",
  "Gloria",
  "Hailey",
  "Heidi",
  "Ilana",
  "Jacqueline",
  "Janelle",
  "Josephine",
  "Joy",
  "Kaitlyn",
  "Kiana",
  "Laila",
  "Lara",
  "Leila",
  "Leslie",
  "Lydia",
  "Maeve",
  "Malia",
  "Marina",
  "Mckenna",
  "Mila",
  "Mina",
  "Morgan",
  "Nia",
  "Nicole",
  "Nina",
  "Noemi",
  "Reese",
  "Renee",
  "Rosa",
  "Rosalie",
  "Sade",
  "Samantha",
  "Sasha",
  "Savannah",
  "Shannon",
  "Sierra",
  "Sofia",
  "Stella",
  "Sydney",
  "Tatiana",
  "Teresa",
  "Valentina",
  "Veronica",
  "Victoria",
  "Willa",
  "Yasmin",
  "Yesenia",
  "Zara"
];

const additionalLastNames = [
  "Adams",
  "Alvarez",
  "Anderson",
  "Armstrong",
  "Bailey",
  "Baker",
  "Banks",
  "Barnes",
  "Bell",
  "Bishop",
  "Blake",
  "Bowen",
  "Boyd",
  "Bradley",
  "Brown",
  "Burke",
  "Burns",
  "Butler",
  "Campbell",
  "Castillo",
  "Chavez",
  "Clark",
  "Cohen",
  "Cook",
  "Cooper",
  "Cox",
  "Daniels",
  "Davis",
  "Dixon",
  "Edwards",
  "Ellis",
  "Evans",
  "Ferguson",
  "Fisher",
  "Flores",
  "Ford",
  "Garcia",
  "Gonzalez",
  "Graham",
  "Gray",
  "Green",
  "Griffin",
  "Hall",
  "Hamilton",
  "Harris",
  "Hernandez",
  "Hill",
  "Howard",
  "Jackson",
  "James",
  "Johnson",
  "Jones",
  "King",
  "Lee",
  "Lewis",
  "Morris",
  "Murphy",
  "Ortiz",
  "Peterson",
  "Phillips",
  "Ramirez",
  "Roberts",
  "Robinson",
  "Rogers",
  "Ross",
  "Sanchez",
  "Sanders",
  "Stewart",
  "Stone",
  "Taylor",
  "Thomas",
  "Turner",
  "Walker",
  "Washington",
  "Watson",
  "Williams",
  "Wilson",
  "Wood",
  "Wright",
  "Young"
];

function buildPersonaNames(targetCount: number) {
  const names = [...seededPersonaNames];
  const seen = new Set(names);
  let index = 0;

  while (names.length < targetCount && index < additionalFirstNames.length * additionalLastNames.length * 2) {
    const firstName = additionalFirstNames[index % additionalFirstNames.length];
    const lastName =
      additionalLastNames[
        (index * 17 + Math.floor(index / additionalFirstNames.length)) % additionalLastNames.length
      ];
    const fullName = `${firstName} ${lastName}`;

    if (!seen.has(fullName)) {
      names.push(fullName);
      seen.add(fullName);
    }

    index += 1;
  }

  return names;
}

const personaNames = buildPersonaNames(defaultReviewPersonaCount);

const ageBands = [
  { label: "21-24", ages: [22, 23, 24, 21] },
  { label: "25-29", ages: [25, 27, 28, 29, 26] },
  { label: "30-34", ages: [30, 31, 33, 34, 32] },
  { label: "35-39", ages: [35, 36, 38, 39, 37] },
  { label: "40-44", ages: [40, 41, 42, 44, 43] },
  { label: "45-49", ages: [45, 46, 47, 49, 48] },
  { label: "50-54", ages: [50, 51, 53, 54, 52] },
  { label: "55-64", ages: [55, 58, 61, 63, 60] }
];

const ethnicities = [
  "Black American",
  "Latina",
  "East Asian American",
  "South Asian American",
  "White American",
  "Middle Eastern American",
  "Native American",
  "Mixed race",
  "Pacific Islander",
  "Southeast Asian American"
];

const occupations = [
  "registered nurse",
  "elementary school teacher",
  "software project manager",
  "small business owner",
  "fitness instructor",
  "retail merchandiser",
  "graduate student",
  "real estate agent",
  "hospitality manager",
  "graphic designer",
  "accounting analyst",
  "flight attendant",
  "pharmacy technician",
  "marketing coordinator",
  "new parent at home",
  "esthetician",
  "office administrator",
  "public relations manager",
  "yoga studio owner",
  "freelance writer",
  "dental hygienist",
  "customer success lead",
  "human resources specialist",
  "interior designer",
  "medical office coordinator",
  "wedding photographer",
  "boutique owner",
  "restaurant manager",
  "executive assistant",
  "financial advisor",
  "lab technician",
  "speech therapist",
  "event planner",
  "fashion buyer",
  "copy editor",
  "community organizer",
  "product designer",
  "insurance agent",
  "nail technician",
  "wellness coach",
  "supply chain coordinator",
  "occupational therapist",
  "library assistant",
  "college counselor",
  "barista trainer",
  "customer support manager",
  "paralegal",
  "sales operations analyst",
  "makeup artist",
  "nonprofit program manager"
];

const incomeLevels = [
  "budget-conscious under 45k household",
  "stable 45k-70k household",
  "comfortable 70k-100k household",
  "upper-middle 100k-150k household",
  "premium 150k-plus household"
];

const locations = [
  "Austin, TX",
  "Seattle, WA",
  "Chicago, IL",
  "Miami, FL",
  "Denver, CO",
  "Los Angeles, CA",
  "Atlanta, GA",
  "Brooklyn, NY",
  "Phoenix, AZ",
  "Portland, OR",
  "Boston, MA",
  "San Diego, CA",
  "Charlotte, NC",
  "Nashville, TN",
  "Minneapolis, MN",
  "Philadelphia, PA",
  "Las Vegas, NV",
  "Tampa, FL",
  "Dallas, TX",
  "San Jose, CA",
  "Columbus, OH",
  "New Orleans, LA",
  "Raleigh, NC",
  "Salt Lake City, UT",
  "Madison, WI",
  "Orlando, FL",
  "Houston, TX",
  "Oakland, CA",
  "Queens, NY",
  "Washington, DC",
  "Kansas City, MO",
  "Charleston, SC",
  "Sacramento, CA",
  "Pittsburgh, PA",
  "Cleveland, OH",
  "Boise, ID",
  "Santa Fe, NM",
  "Richmond, VA",
  "Honolulu, HI",
  "Detroit, MI"
];

const personalities = [
  "detail-oriented and careful",
  "warm and conversational",
  "skeptical but fair",
  "busy and practical",
  "trend-aware and social",
  "minimalist and direct",
  "research-heavy and ingredient-aware",
  "gentle and reassuring",
  "playful and expressive",
  "patient and routine-driven",
  "quick to notice texture changes",
  "budget-minded but quality-focused",
  "quietly analytical",
  "brand-loyal once convinced",
  "comparison-heavy and practical",
  "sensitive to scent and finish",
  "low-maintenance but observant",
  "gift-oriented and thoughtful",
  "routine-curious but time-poor",
  "methodical and note-taking",
  "optimistic but not exaggerated",
  "direct and slightly dry",
  "polished and image-conscious",
  "family-focused and pragmatic",
  "cautious with new formulas"
];

const bodyTypes = [
  "petite frame",
  "athletic build",
  "curvy build",
  "tall and lean frame",
  "average build",
  "plus-size build",
  "short and sturdy build",
  "soft hourglass build"
];

const skinTypes = [
  "dry skin",
  "oily skin",
  "combination skin",
  "sensitive skin",
  "normal skin",
  "dehydrated skin",
  "mature skin",
  "blemish-prone skin"
];

const skinConcerns = [
  "dullness",
  "uneven tone",
  "rough texture",
  "dry patches",
  "visible pores",
  "post-breakout marks",
  "fine lines",
  "redness-prone days",
  "makeup pilling",
  "seasonal dryness",
  "tightness after cleansing",
  "loss of bounce",
  "midday shine",
  "winter flaking",
  "post-travel dehydration",
  "visible tiredness",
  "texture around the chin",
  "dryness around the nose",
  "uneven glow",
  "humidity-related heaviness"
];

const lifestyles = [
  "early workouts and quick morning routines",
  "long shifts with little time for touch-ups",
  "hybrid office days and weekend errands",
  "school drop-offs and late-night self-care",
  "frequent travel and changing climates",
  "content-heavy social schedule",
  "quiet evenings and consistent routines",
  "outdoor walks and sunscreen-first habits",
  "client-facing workdays",
  "low-maintenance apartment routine",
  "commuting by train with a compact makeup bag",
  "school events, work calls, and short evening routines",
  "frequent gym classes and post-shower skincare",
  "late restaurant shifts and recovery mornings",
  "dry office air and careful desk-side touch-ups",
  "weekend markets and outdoor brunch plans",
  "airport travel and sample-size skincare",
  "video meetings where skin finish matters",
  "shared bathroom shelves and simple routines",
  "quiet Sunday reset routines"
];

const shoppingMotivations = [
  "wants dependable texture before buying again",
  "looks for ingredients that fit a visible concern",
  "buys after comparing reviews and routine videos",
  "prefers products that do not complicate her shelf",
  "is willing to pay more when the finish feels premium",
  "tries products when they solve a specific daily annoyance",
  "likes a product that feels giftable but still useful",
  "waits for social proof before committing",
  "buys when the routine step sounds easy to repeat",
  "needs a formula that works under makeup",
  "looks for a product that will not irritate sensitive days",
  "cares about packaging but repurchases only for performance",
  "likes to test one new product at a time",
  "reorders when the finish fits her morning schedule",
  "is persuaded by specific texture descriptions",
  "wants a product that travels well",
  "needs a gentle upgrade from basic drugstore staples",
  "prefers reviews that mention both pros and limits"
];

const priceSensitivities = [
  "price-sensitive and expects value",
  "balanced value seeker",
  "comfortable paying for visible quality",
  "premium-minded but dislikes waste",
  "sale-aware but not discount-only"
];

const productPreferences = [
  "lightweight serum textures",
  "comforting night creams",
  "non-stripping cleansers",
  "soft glow without shine",
  "makeup-friendly finishes",
  "simple two-step routines",
  "restorative evening products",
  "skin-barrier comfort",
  "brightening products that feel gentle",
  "products that absorb quickly",
  "fragrance-light formulas",
  "products that sit cleanly under sunscreen",
  "hydration without a sticky finish",
  "creams that feel cushiony but not heavy",
  "serums that do not pill under moisturizer",
  "gentle glow products",
  "smooth texture before makeup",
  "products with a clean pump or tidy jar feel",
  "calming products for inconsistent skin days",
  "routine staples that are easy to explain"
];

const writingStyles = [
  "short plain sentences with one concrete routine detail",
  "balanced paragraph with a clear first impression and result",
  "chatty review with a small personal aside",
  "direct pros-and-cons wording without bullets",
  "ingredient-aware but still casual",
  "soft enthusiastic phrasing with natural qualifiers",
  "skeptical opening followed by a measured opinion",
  "practical wording focused on use case and texture",
  "polished review style with tidy transitions",
  "brief mobile-style comment with everyday vocabulary",
  "starts with the reason she bought it and ends with whether she would reorder",
  "uses one comparison to a product type she already knows",
  "mentions one small drawback before giving the final opinion",
  "writes like she is texting a friend but still specific",
  "opens with a routine moment instead of a general verdict",
  "uses concrete timing such as morning, after shower, or before makeup",
  "sounds like a careful shopper leaving a practical note",
  "has one crisp sentence followed by a slightly longer explanation",
  "focuses on repeat use rather than dramatic first impressions",
  "keeps enthusiasm restrained and believable"
];

const reviewTones = [
  "calm positive",
  "reserved but satisfied",
  "warmly enthusiastic",
  "matter-of-fact",
  "curious and observant",
  "slightly picky",
  "gentle and reassuring",
  "confident repeat-buyer",
  "pleasantly surprised",
  "low-key practical",
  "thoughtfully critical",
  "softly impressed",
  "texture-focused",
  "routine-first",
  "comparison-minded",
  "budget-aware",
  "scent-sensitive",
  "busy-morning practical",
  "polished but not salesy",
  "honest and measured"
];

const routineLevels = [
  "beginner two-step routine",
  "simple morning-and-night routine",
  "ingredient-aware intermediate routine",
  "skin-care hobbyist routine",
  "minimalist routine with few products"
];

const socialChannels = [
  "Amazon review reader",
  "TikTok beauty browser",
  "Instagram skincare saver",
  "YouTube routine watcher",
  "newsletter shopper",
  "friend-recommendation buyer",
  "Reddit skincare lurker",
  "Google search comparer",
  "dermatologist-office sample tester",
  "Sephora review scanner",
  "Ulta points shopper",
  "beauty podcast listener",
  "Facebook group recommendation reader",
  "Pinterest routine saver",
  "work-friend recommendation buyer",
  "subscription box sampler"
];

const lifeStages = [
  "early career",
  "career-building",
  "new mother",
  "mid-career",
  "empty nester",
  "graduate school",
  "career pivot",
  "small business phase",
  "returning to in-office work",
  "planning a wedding",
  "postpartum routine rebuild",
  "frequent business travel",
  "new homeowner",
  "caregiving season",
  "fitness-focused reset",
  "dating again",
  "promotion year",
  "simplifying after a busy move"
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pick<T>(values: T[], index: number, offset = 0) {
  return values[(index + offset) % values.length];
}

function buildLifeImagePrompt(input: {
  fullName: string;
  age: number;
  ethnicity: string;
  occupation: string;
  location: string;
  lifestyle: string;
  bodyType: string;
}) {
  return [
    `Lifestyle photo brief for ${input.fullName}.`,
    `${input.age}-year-old ${input.ethnicity.toLowerCase()} woman, ${input.bodyType}, ${input.occupation}, based around ${input.location}.`,
    `Candid everyday skincare moment connected to ${input.lifestyle}.`,
    "Natural window light, real home or work-adjacent setting, modest styling, warm but not glossy advertising, no medical imagery."
  ].join(" ");
}

function buildPersona(index: number) {
  const band = pick(ageBands, index);
  const age = pick(band.ages, index, Math.floor(index / ageBands.length));
  const fullName = personaNames[index];
  const ethnicity = pick(ethnicities, index, Math.floor(index / 3));
  const occupation = pick(occupations, index, Math.floor(index / 5));
  const incomeLevel = pick(incomeLevels, index, Math.floor(index / 7));
  const location = pick(locations, index, Math.floor(index / 4));
  const personality = pick(personalities, index, Math.floor(index / 2));
  const bodyType = pick(bodyTypes, index, Math.floor(index / 6));
  const skinType = pick(skinTypes, index, Math.floor(index / 9));
  const skinConcern = pick(skinConcerns, index, Math.floor(index / 4));
  const lifestyle = pick(lifestyles, index, Math.floor(index / 5));
  const shoppingMotivation = pick(shoppingMotivations, index, Math.floor(index / 8));
  const priceSensitivity = pick(priceSensitivities, index, Math.floor(index / 6));
  const productPreference = pick(productPreferences, index, Math.floor(index / 3));
  const writingStyle = pick(writingStyles, index, Math.floor(index / 4));
  const reviewTone = pick(reviewTones, index, Math.floor(index / 6));
  const routineLevel = pick(routineLevels, index, Math.floor(index / 5));
  const socialChannel = pick(socialChannels, index, Math.floor(index / 7));
  const lifeStage = pick(lifeStages, index, Math.floor(index / 6));
  const tags = [
    band.label,
    ethnicity,
    occupation,
    incomeLevel,
    skinType,
    skinConcern,
    personality,
    writingStyle,
    reviewTone,
    productPreference
  ];

  return {
    slug: `review-persona-${String(index + 1).padStart(3, "0")}-${slugify(fullName)}`,
    fullName,
    age,
    ageRange: band.label,
    ethnicity,
    occupation,
    incomeLevel,
    location,
    personality,
    bodyType,
    skinType,
    skinConcern,
    lifestyle,
    shoppingMotivation,
    priceSensitivity,
    productPreference,
    writingStyle,
    reviewTone,
    routineLevel,
    socialChannel,
    lifeStage,
    tags,
    notes: [
      `${fullName} should write like a ${personality} ${occupation}.`,
      `Her review should naturally reflect ${skinType}, ${skinConcern}, ${productPreference}, and ${priceSensitivity}.`,
      `Avoid making her sound like a brand copywriter; keep the voice close to ${writingStyle}.`
    ].join(" "),
    lifeImagePrompt: buildLifeImagePrompt({
      fullName,
      age,
      ethnicity,
      occupation,
      location,
      lifestyle,
      bodyType
    }),
    lifeImageUrl: null,
    active: true,
    sortOrder: index
  };
}

export const defaultReviewPersonas = personaNames.map((_, index) => buildPersona(index));

export const reviewPersonaPageSizeOptions = [20, 50] as const;

export type ReviewLengthTarget = "short" | "medium" | "long";
export type ReviewPersonaForGeneration = ReturnType<typeof mapPersonaForGeneration>;

const reviewLengthTargets: ReviewLengthTarget[] = ["short", "medium", "long"];

const reviewLengthInstructions: Record<ReviewLengthTarget, string> = {
  short: "Short review: 1-2 sentences, about 35-75 words, one clear product-use detail.",
  medium: "Medium review: 2-4 sentences, about 80-145 words, include texture or routine context plus one result.",
  long: "Long review: 4-7 sentences, about 150-230 words, include purchase context, routine use, texture, and a balanced final opinion."
};

const reviewAngles = [
  "texture-first first impression",
  "two-week routine update",
  "makeup-layering check",
  "morning routine speed test",
  "evening recovery routine",
  "sensitive-day caution",
  "travel-climate check",
  "repurchase decision note",
  "giftability and packaging note",
  "comparison with a previous staple",
  "value-for-money reflection",
  "dry office air use case",
  "post-workout routine note",
  "minimal shelf routine",
  "seasonal skin transition"
];

const reviewStructures = [
  "open with why she bought it, add one routine moment, then give a measured verdict",
  "start with texture, compare it to a familiar product type, then say whether she would reorder",
  "begin with one small hesitation, explain what changed after use, then close naturally",
  "lead with a practical use case, mention one sensory detail, then summarize the payoff",
  "open like a quick phone note, add one specific result, then end with a plain recommendation",
  "start with packaging or application, move into skin feel, then mention the biggest limitation",
  "begin with the rating rationale, give two concrete details, then close with who it suits",
  "tell a short routine story in chronological order without sounding polished",
  "compare morning and night use, then name the context where it works best",
  "write as a repeat-use update rather than a first-impression review"
];

const reviewDetailFocuses = [
  "absorption speed",
  "finish under sunscreen",
  "how it layers under makeup",
  "skin feel after several hours",
  "comfort on dry patches",
  "how much product she uses",
  "scent or lack of scent",
  "texture after cleansing",
  "whether it pills with other products",
  "next-morning softness",
  "midday shine control",
  "how it fits around travel",
  "packaging convenience",
  "value compared with similar products",
  "whether it feels heavy in humid weather"
];

const reviewPhrasingGuides = [
  "use contractions and one casual aside",
  "keep one sentence very short",
  "include one mild drawback without turning negative",
  "avoid polished marketing rhythm",
  "use simple everyday vocabulary",
  "sound like a careful buyer, not a beauty editor",
  "include one specific time of day",
  "avoid starting with the product name",
  "use one concrete comparison, not a broad claim",
  "keep the final sentence understated"
];

type ReviewVariationAssignment = {
  reviewLength: ReviewLengthTarget;
  reviewAngle: string;
  reviewStructure: string;
  reviewDetailFocus: string;
  reviewPhrasingGuide: string;
};

function parseTags(value: string | null | undefined) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function shuffle<T>(values: T[]) {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function pickRandom<T>(values: T[]) {
  return values[randomInt(values.length)] ?? values[0];
}

function pickRandomReviewLength() {
  return pickRandom(reviewLengthTargets) ?? "medium";
}

function buildRandomReviewVariation(): ReviewVariationAssignment {
  return {
    reviewLength: pickRandomReviewLength(),
    reviewAngle: pickRandom(reviewAngles) ?? reviewAngles[0],
    reviewStructure: pickRandom(reviewStructures) ?? reviewStructures[0],
    reviewDetailFocus: pickRandom(reviewDetailFocuses) ?? reviewDetailFocuses[0],
    reviewPhrasingGuide: pickRandom(reviewPhrasingGuides) ?? reviewPhrasingGuides[0]
  };
}

function normalizeReviewPersonaPage(value: unknown) {
  const page = Number.parseInt(String(value || "1"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function normalizeReviewPersonaPerPage(value: unknown) {
  const perPage = Number.parseInt(String(value || ""), 10);
  return reviewPersonaPageSizeOptions.includes(perPage as (typeof reviewPersonaPageSizeOptions)[number])
    ? perPage
    : 20;
}

export function getReviewLengthInstruction(reviewLength: ReviewLengthTarget) {
  return reviewLengthInstructions[reviewLength];
}

function mapPersonaForGeneration(persona: any, variation: Partial<ReviewVariationAssignment> = {}) {
  const assignedVariation: ReviewVariationAssignment = {
    reviewLength: variation.reviewLength ?? "medium",
    reviewAngle: variation.reviewAngle ?? reviewAngles[0],
    reviewStructure: variation.reviewStructure ?? reviewStructures[0],
    reviewDetailFocus: variation.reviewDetailFocus ?? reviewDetailFocuses[0],
    reviewPhrasingGuide: variation.reviewPhrasingGuide ?? reviewPhrasingGuides[0]
  };

  return {
    id: persona.id,
    slug: persona.slug,
    fullName: persona.fullName,
    age: persona.age,
    ageRange: persona.ageRange,
    ethnicity: persona.ethnicity,
    occupation: persona.occupation,
    incomeLevel: persona.incomeLevel,
    location: persona.location,
    personality: persona.personality,
    bodyType: persona.bodyType,
    skinType: persona.skinType,
    skinConcern: persona.skinConcern,
    lifestyle: persona.lifestyle,
    shoppingMotivation: persona.shoppingMotivation,
    priceSensitivity: persona.priceSensitivity,
    productPreference: persona.productPreference,
    writingStyle: persona.writingStyle,
    reviewTone: persona.reviewTone,
    routineLevel: persona.routineLevel,
    socialChannel: persona.socialChannel,
    lifeStage: persona.lifeStage,
    tags: parseTags(persona.tags),
    notes: persona.notes,
    lifeImagePrompt: persona.lifeImagePrompt ?? null,
    lifeImageUrl: persona.lifeImageUrl ?? null,
    ...assignedVariation
  };
}

function mapPersonaRecord(persona: any): ReviewPersonaRecord {
  const recentReviews = Array.isArray(persona.reviews)
    ? persona.reviews.map((review: any) => ({
        id: review.id,
        productName: review.product?.name ?? "Unknown product",
        productSlug: review.product?.slug ?? "",
        rating: review.rating,
        title: review.title,
        content: review.content,
        status: review.status,
        reviewDate: new Date(review.reviewDate ?? review.createdAt)
      }))
    : [];

  return {
    ...mapPersonaForGeneration(persona),
    active: persona.active,
    sortOrder: persona.sortOrder,
    reviewCount: persona._count?.reviews ?? recentReviews.length,
    recentReviews,
    createdAt: new Date(persona.createdAt),
    updatedAt: new Date(persona.updatedAt)
  };
}

export function formatReviewPersonaForPrompt(persona: ReviewPersonaForGeneration, index: number) {
  return [
    `${index + 1}. personaSlug: ${persona.slug}`,
    `Full name: ${persona.fullName}`,
    `Age: ${persona.age} (${persona.ageRange})`,
    `Ethnicity: ${persona.ethnicity}`,
    `Occupation: ${persona.occupation}`,
    `Income level: ${persona.incomeLevel}`,
    `Location: ${persona.location}`,
    `Personality: ${persona.personality}`,
    `Body type: ${persona.bodyType}`,
    `Skin type and concern: ${persona.skinType}; ${persona.skinConcern}`,
    `Lifestyle: ${persona.lifestyle}`,
    `Shopping motivation: ${persona.shoppingMotivation}`,
    `Price sensitivity: ${persona.priceSensitivity}`,
    `Product preference: ${persona.productPreference}`,
    `Writing habit: ${persona.writingStyle}`,
    `Review tone: ${persona.reviewTone}`,
    `Routine level: ${persona.routineLevel}`,
    `Social source: ${persona.socialChannel}`,
    `Life stage: ${persona.lifeStage}`,
    `Review length target: ${getReviewLengthInstruction(persona.reviewLength)}`,
    `Review angle: ${persona.reviewAngle}`,
    `Review structure: ${persona.reviewStructure}`,
    `Detail focus: ${persona.reviewDetailFocus}`,
    `Phrasing guide: ${persona.reviewPhrasingGuide}`,
    `Tags: ${persona.tags.join(", ")}`,
    `Notes: ${persona.notes}`
  ].join("\n");
}

export async function ensureDefaultReviewPersonas() {
  await prisma.reviewPersona.createMany({
    data: defaultReviewPersonas.map((persona) => ({
      ...persona,
      tags: persona.tags.join("\n")
    })),
    skipDuplicates: true
  });
}

function rankPersonasForGeneration(personas: any[]) {
  return shuffle(personas)
    .map((persona, randomOrder) => ({
      persona,
      usedOnProduct: Array.isArray(persona.reviews) && persona.reviews.length > 0 ? 1 : 0,
      totalReviewCount: persona._count?.reviews ?? 0,
      randomOrder
    }))
    .sort(
      (left, right) =>
        left.usedOnProduct - right.usedOnProduct ||
        left.totalReviewCount - right.totalReviewCount ||
        left.randomOrder - right.randomOrder
    )
    .map((item) => item.persona);
}

export async function selectReviewPersonasForGeneration(productId: string, quantity: number) {
  await ensureDefaultReviewPersonas();

  const personas = await prisma.reviewPersona.findMany({
    where: { active: true },
    include: {
      _count: {
        select: {
          reviews: true
        }
      },
      reviews: {
        where: { productId },
        select: {
          id: true
        },
        take: 1
      }
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  if (personas.length === 0) {
    return [];
  }

  const count = Math.max(1, Math.round(quantity));
  const selected = [];

  while (selected.length < count) {
    selected.push(...rankPersonasForGeneration(personas));
  }

  return selected
    .slice(0, count)
    .map((persona) => mapPersonaForGeneration(persona, buildRandomReviewVariation()));
}

export async function getAdminReviewPersonaPage(options: {
  page?: unknown;
  perPage?: unknown;
} = {}): Promise<AdminReviewPersonaPageRecord> {
  await ensureDefaultReviewPersonas();

  const requestedPage = normalizeReviewPersonaPage(options.page);
  const perPage = normalizeReviewPersonaPerPage(options.perPage);
  const [totalCount, activeCount, reviewCount] = await Promise.all([
    prisma.reviewPersona.count(),
    prisma.reviewPersona.count({ where: { active: true } }),
    prisma.productReview.count({
      where: {
        personaId: {
          not: null
        }
      }
    })
  ]);
  const pageCount = Math.max(1, Math.ceil(totalCount / perPage));
  const currentPage = Math.min(requestedPage, pageCount);
  const personas = await prisma.reviewPersona.findMany({
    include: {
      _count: {
        select: {
          reviews: true
        }
      },
      reviews: {
        include: {
          product: true
        },
        orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }],
        take: 2
      }
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    skip: (currentPage - 1) * perPage,
    take: perPage
  });

  return {
    personas: personas.map(mapPersonaRecord),
    totalCount,
    activeCount,
    defaultCount: defaultReviewPersonas.length,
    reviewCount,
    currentPage,
    perPage,
    pageCount,
    hasNextPage: currentPage < pageCount,
    hasPreviousPage: currentPage > 1
  };
}
