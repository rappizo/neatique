import { redirect } from "next/navigation";
import { getComicLanguageHref, getComicLanguageState } from "@/lib/comic-language";

type ComicChapterPageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function ComicChapterPage({ searchParams }: ComicChapterPageProps) {
  const query = await searchParams;
  const languageState = await getComicLanguageState(query);

  redirect(getComicLanguageHref("/comic", languageState.language));
}
