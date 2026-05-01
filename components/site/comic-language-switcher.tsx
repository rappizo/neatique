import Link from "next/link";
import { getComicLanguageHref, type ComicLanguage } from "@/lib/comic-language";

type ComicLanguageSwitcherProps = {
  basePath: string;
  language: ComicLanguage;
  show: boolean;
};

export function ComicLanguageSwitcher({ basePath, language, show }: ComicLanguageSwitcherProps) {
  if (!show) {
    return null;
  }

  return (
    <nav className="comic-language-switcher" aria-label="Comic language">
      <Link
        href={getComicLanguageHref(basePath, "en")}
        className={language === "en" ? "is-active" : undefined}
      >
        English
      </Link>
      <Link
        href={getComicLanguageHref(basePath, "zh")}
        className={language === "zh" ? "is-active" : undefined}
      >
        中文
      </Link>
    </nav>
  );
}
