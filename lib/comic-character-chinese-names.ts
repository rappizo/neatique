export type ComicCharacterChineseNameLock = {
  name: string;
  chineseName: string | null;
};

const DEFAULT_COMIC_CHARACTER_CHINESE_NAMES = new Map<string, string>([
  ["muci", "慕西"],
  ["artrans", "安川西"],
  ["nia", "尼亚"],
  ["padaruna", "啪嗒瑞娜"],
  ["padarana", "啪嗒安娜"],
  ["snacri", "斯奈奎"],
  ["sunny-spritz", "阳关斯普丽兹"],
  ["sunny spritz", "阳关斯普丽兹"],
  ["coach-ray", "雷教练"],
  ["coach ray", "雷教练"],
  ["mira-mistwell", "米拉"],
  ["mira mistwell", "米拉"],
  ["professor-cera-lin", "林塞拉教授"],
  ["professor cera lin", "林塞拉教授"],
  ["prefessor cera lin", "林塞拉教授"],
  ["dewey-dot", "迪威多特"],
  ["dewey dot", "迪威多特"],
  ["vela-sheen", "席恩维拉"],
  ["vela sheen", "席恩维拉"],
  ["dean-lucent-vale", "卢森威尔院长"],
  ["dean lucent vale", "卢森威尔院长"]
]);

function normalizeChineseNameLookupKey(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export function normalizeComicCharacterChineseName(value?: string | null) {
  const normalized = (value || "").trim();
  return normalized || null;
}

export function getDefaultComicCharacterChineseName(input: {
  slug?: string | null;
  name?: string | null;
}) {
  const slugName = DEFAULT_COMIC_CHARACTER_CHINESE_NAMES.get(
    normalizeChineseNameLookupKey(input.slug)
  );

  if (slugName) {
    return slugName;
  }

  return (
    DEFAULT_COMIC_CHARACTER_CHINESE_NAMES.get(normalizeChineseNameLookupKey(input.name)) || null
  );
}

export function resolveComicCharacterChineseName(input: {
  slug?: string | null;
  name?: string | null;
  chineseName?: string | null;
}) {
  return (
    normalizeComicCharacterChineseName(input.chineseName) ||
    getDefaultComicCharacterChineseName(input)
  );
}

export function toComicCharacterChineseNameLock(input: {
  name: string;
  slug?: string | null;
  chineseName?: string | null;
}): ComicCharacterChineseNameLock {
  return {
    name: input.name,
    chineseName: resolveComicCharacterChineseName(input)
  };
}

export function toComicCharacterChineseNameLocks(
  characters: Array<{ name: string; slug?: string | null; chineseName?: string | null }>
) {
  return characters.map(toComicCharacterChineseNameLock);
}

export function formatComicCharacterBilingualName(input: {
  name: string;
  slug?: string | null;
  chineseName?: string | null;
}) {
  const chineseName = resolveComicCharacterChineseName(input);
  return chineseName ? `${input.name} = ${chineseName}` : input.name;
}

export function formatComicCharacterChineseNameLocks(
  locks: readonly ComicCharacterChineseNameLock[] = []
) {
  const lines = locks
    .filter((lock) => lock.name.trim())
    .map((lock) =>
      lock.chineseName
        ? `- ${lock.name} = ${lock.chineseName}`
        : `- ${lock.name} = keep the English name if no Chinese name is listed`
    );

  return lines.length > 0
    ? ["Character Chinese name locks:", ...lines].join("\n")
    : "Character Chinese name locks: None entered.";
}
