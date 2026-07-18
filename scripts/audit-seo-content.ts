import { prisma } from "../lib/db";

async function main() {
  const posts = await prisma.post.findMany({
  where: { published: true },
  select: {
    title: true,
    slug: true,
    excerpt: true,
    category: true,
    readTime: true,
    coverImageAlt: true,
    coverImageUrl: true,
    seoTitle: true,
    seoDescription: true,
    aiGenerated: true,
    focusKeyword: true,
    secondaryKeywords: true,
    externalLinks: true,
    publishedAt: true,
    updatedAt: true,
    content: true
  },
  orderBy: { publishedAt: "desc" }
  });

  console.log(
    JSON.stringify(
      posts.map((post) => ({
        ...post,
        content: undefined,
        contentLength: post.content.length,
        internalLinks: (post.content.match(/\]\(\//g) || []).length,
        externalLinkCount: (post.content.match(/https?:\/\//g) || []).length
      })),
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
