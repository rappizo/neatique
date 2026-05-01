import { headers } from "next/headers";

export type ComicLanguage = "en" | "zh";

export type ComicLanguageState = {
  language: ComicLanguage;
  showSwitcher: boolean;
  countryCode: string | null;
};

export function getComicLanguageHref(path: string, language: ComicLanguage) {
  return language === "zh" ? `${path}?lang=zh` : path;
}

export async function getComicLanguageState(searchParams: {
  lang?: string | string[];
}): Promise<ComicLanguageState> {
  const requestHeaders = await headers();
  const countryCode = (
    requestHeaders.get("x-vercel-ip-country") ||
    requestHeaders.get("cf-ipcountry") ||
    requestHeaders.get("cloudfront-viewer-country") ||
    requestHeaders.get("x-country-code") ||
    ""
  )
    .trim()
    .toUpperCase();
  const isChina = countryCode === "CN";
  const allowLocalSwitcher = process.env.NODE_ENV !== "production" && !countryCode;
  const showSwitcher = isChina || allowLocalSwitcher;
  const requestedLanguage = Array.isArray(searchParams.lang)
    ? searchParams.lang[0]
    : searchParams.lang;

  return {
    language: showSwitcher && requestedLanguage === "zh" ? "zh" : "en",
    showSwitcher,
    countryCode: countryCode || null
  };
}
