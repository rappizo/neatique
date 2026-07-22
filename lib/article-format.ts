export type ArticleBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "image"; src: string; alt: string; caption: string | null }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

const ARTICLE_IMAGE_PATTERN = /^!\[([^\]]+)\]\((\S+?)(?:\s+"([^"]+)")?\)$/;

export function normalizeArticleContent(content: string) {
  const raw = String(content || "");

  let normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (!normalized.includes("\n") && normalized.includes("\\n")) {
    normalized = normalized.replace(/\\n/g, "\n");
  }

  return normalized.replace(/\n{3,}/g, "\n\n");
}

export function parseArticleContent(content: string): ArticleBlock[] {
  const normalized = normalizeArticleContent(content);

  if (!normalized) {
    return [];
  }

  const blocks: ArticleBlock[] = [];
  const paragraphLines: string[] = [];
  const listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" ").replace(/\s{2,}/g, " ").trim()
    });
    paragraphLines.length = 0;
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push({
      type: "list",
      items: [...listItems]
    });
    listItems.length = 0;
  };

  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", text: trimmed.replace(/^###\s+/, "").trim() });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", text: trimmed.replace(/^##\s+/, "").trim() });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      listItems.push(trimmed.replace(/^-\s+/, "").trim());
      continue;
    }

    const imageMatch = trimmed.match(ARTICLE_IMAGE_PATTERN);

    if (imageMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "image",
        alt: imageMatch[1].trim(),
        src: imageMatch[2].trim(),
        caption: imageMatch[3]?.trim() || null
      });
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function slugifyArticleHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

export function extractArticleImages(content: string) {
  return parseArticleContent(content)
    .filter((block): block is Extract<ArticleBlock, { type: "image" }> => block.type === "image")
    .map(({ src, alt, caption }) => ({ src, alt, caption }));
}

function stripInlineArticleMarkup(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function extractArticleFaqs(content: string) {
  const blocks = parseArticleContent(content);
  const faqs: Array<{ question: string; answer: string }> = [];
  let insideFaqSection = false;
  let currentQuestion = "";
  let currentAnswerParts: string[] = [];

  const flushFaq = () => {
    const question = stripInlineArticleMarkup(currentQuestion);
    const answer = stripInlineArticleMarkup(currentAnswerParts.join(" "));

    if (question && answer) {
      faqs.push({ question, answer });
    }

    currentQuestion = "";
    currentAnswerParts = [];
  };

  for (const block of blocks) {
    if (block.type === "h2") {
      if (insideFaqSection) {
        flushFaq();
        break;
      }

      insideFaqSection = /^(frequently asked questions|faqs?)$/i.test(block.text.trim());
      continue;
    }

    if (!insideFaqSection) {
      continue;
    }

    if (block.type === "h3") {
      flushFaq();
      currentQuestion = block.text;
      continue;
    }

    if (block.type === "paragraph" && currentQuestion) {
      currentAnswerParts.push(block.text);
    } else if (block.type === "list" && currentQuestion) {
      currentAnswerParts.push(block.items.join("; "));
    }
  }

  if (insideFaqSection) {
    flushFaq();
  }

  return faqs;
}
