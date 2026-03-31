import { existsSync } from "node:fs";
import path from "node:path";
import type { MascotRewardRecord } from "@/lib/types";
import { buildSiteImageUrl } from "@/lib/site-media";

export const RYO_REWARD_POINTS = 500;
export const MASCOT_REDEMPTION_POINTS = 1000;

function encodeSvgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildMascotPlaceholderImage(input: {
  name: string;
  accent: string;
  accentSoft: string;
}) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fffaf7"/>
          <stop offset="100%" stop-color="${input.accentSoft}"/>
        </linearGradient>
        <linearGradient id="drop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="${input.accent}"/>
        </linearGradient>
      </defs>
      <rect width="640" height="640" rx="56" fill="url(#bg)"/>
      <path d="M320 118c70 112 150 164 150 268 0 89-66 154-150 154s-150-65-150-154c0-104 80-156 150-268Z" fill="url(#drop)"/>
      <circle cx="270" cy="327" r="21" fill="#221b17"/>
      <circle cx="370" cy="327" r="21" fill="#221b17"/>
      <path d="M274 391c18 19 73 19 91 0" stroke="#221b17" stroke-width="14" stroke-linecap="round"/>
      <circle cx="242" cy="373" r="18" fill="#f7b8b1" opacity="0.7"/>
      <circle cx="398" cy="373" r="18" fill="#f7b8b1" opacity="0.7"/>
      <text x="50%" y="594" text-anchor="middle" fill="#3b312d" font-family="Georgia, serif" font-size="34">${input.name}</text>
    </svg>
  `;

  return encodeSvgDataUrl(svg);
}

function buildQrPlaceholderImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="none">
      <rect width="640" height="640" rx="40" fill="#ffffff"/>
      <rect x="64" y="64" width="148" height="148" rx="24" stroke="#121212" stroke-width="18"/>
      <rect x="428" y="64" width="148" height="148" rx="24" stroke="#121212" stroke-width="18"/>
      <rect x="64" y="428" width="148" height="148" rx="24" stroke="#121212" stroke-width="18"/>
      <path d="M292 108h52v52h-52zm94 0h52v52h-52zm-94 94h52v52h-52zm94 94h52v52h-52zm-188 0h52v52h-52zm188 188h52v52h-52zm94-94h52v52h-52zm-282 94h52v52h-52zm188-188h52v52h-52z" fill="#121212"/>
      <path d="M106 106h64v64h-64zm364 0h64v64h-64zm-364 364h64v64h-64z" fill="#ed7361"/>
      <text x="50%" y="296" text-anchor="middle" fill="#121212" font-family="Arial, sans-serif" font-size="30">Upload TikTok QR Code</text>
      <text x="50%" y="340" text-anchor="middle" fill="#6d625e" font-family="Arial, sans-serif" font-size="24">The mascot promo page is ready for your real asset.</text>
    </svg>
  `;

  return encodeSvgDataUrl(svg);
}

function findMascotQrImageUrl() {
  const root = path.join(process.cwd(), "images");
  const candidatePaths = [
    path.join(root, "mascots", "tk QR Code.png"),
    path.join(root, "mascots", "TikTok QR Code.png"),
    path.join(root, "mascots", "tiktok-qr.png"),
    path.join(root, "mascot", "tk QR Code.png"),
    path.join(root, "mascot", "TikTok QR Code.png"),
    path.join(root, "mascot", "tiktok-qr.png")
  ];

  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath)) {
      const folder = path.basename(path.dirname(candidatePath));
      return buildSiteImageUrl(folder, path.basename(candidatePath));
    }
  }

  return buildQrPlaceholderImage();
}

type DefaultMascotSeed = {
  sku: string;
  name: string;
  slug: string;
  description: string;
  accent: string;
  accentSoft: string;
};

const DEFAULT_MASCOT_SEEDS: DefaultMascotSeed[] = [
  {
    sku: "MSC001",
    name: "Cutie Drop",
    slug: "cutie-drop",
    description: "A soft cream-drop mascot reserved for members who redeem 1,000 Neatique points.",
    accent: "#f3eadf",
    accentSoft: "#f7efe7"
  },
  {
    sku: "MSC002",
    name: "Blush Drop",
    slug: "blush-drop",
    description: "A rosy blush-drop mascot that adds a playful reward to your points collection.",
    accent: "#ffd4db",
    accentSoft: "#fff1f4"
  },
  {
    sku: "MSC003",
    name: "Golden Drop",
    slug: "golden-drop",
    description: "A satin-finish golden drop mascot that feels polished, bright, and collectible.",
    accent: "#f3deb2",
    accentSoft: "#fff5da"
  },
  {
    sku: "MSC004",
    name: "Soft Swirl",
    slug: "soft-swirl",
    description: "A dreamy swirl mascot with a cozy cream tone and a playful, loungey expression.",
    accent: "#f7e8d7",
    accentSoft: "#fff7f0"
  },
  {
    sku: "MSC005",
    name: "Pink Drop",
    slug: "pink-drop",
    description: "A classic pink drop mascot for customers who want a cheerful redemption favorite.",
    accent: "#ffcad9",
    accentSoft: "#fff4f7"
  },
  {
    sku: "MSC006",
    name: "Sky Drop",
    slug: "sky-drop",
    description: "A soft blue drop mascot that rounds out the collection with a fresh, airy look.",
    accent: "#cfe8ff",
    accentSoft: "#f2f8ff"
  }
];

export function getDefaultMascotRewards(): MascotRewardRecord[] {
  const createdAt = new Date("2026-03-31T08:00:00.000Z");

  return DEFAULT_MASCOT_SEEDS.map((seed, index) => ({
    id: `mascot-${seed.slug}`,
    sku: seed.sku,
    name: seed.name,
    slug: seed.slug,
    description: seed.description,
    imageUrl: buildMascotPlaceholderImage({
      name: seed.name,
      accent: seed.accent,
      accentSoft: seed.accentSoft
    }),
    pointsCost: MASCOT_REDEMPTION_POINTS,
    active: true,
    sortOrder: index + 1,
    redemptionCount: 0,
    createdAt,
    updatedAt: createdAt
  }));
}

export function getMascotPromoQrImageUrl() {
  return findMascotQrImageUrl();
}
