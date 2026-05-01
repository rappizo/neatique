import { redirect } from "next/navigation";
import { getComicLanguageHref, getComicLanguageState } from "@/lib/comic-language";

type ComicSeasonPageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function ComicSeasonPage({ searchParams }: ComicSeasonPageProps) {
  const query = await searchParams;
  const languageState = await getComicLanguageState(query);

  redirect(getComicLanguageHref("/comic", languageState.language));
}
