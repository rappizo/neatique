import type { Metadata } from "next";
import { PostCard } from "@/components/ui/post-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPublishedPosts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Beauty Tips",
  description: "Read Neatique Beauty Tips for simple skincare guidance, routine ideas, and ingredient stories."
};

export default async function BeautyTipsPage() {
  const posts = await getPublishedPosts();

  return (
    <section className="section">
      <div className="container">
        <div className="page-hero">
          <p className="eyebrow">Beauty Tips</p>
          <h1>Skincare reads made to feel simple, clear, and genuinely helpful.</h1>
          <p>
            From ingredient highlights to layering tips, this space is here to make everyday
            skincare feel easier to understand and more enjoyable to explore.
          </p>
          <div className="page-hero__stats">
            <span className="pill">{posts.length} articles</span>
            <span className="pill">Routine tips</span>
            <span className="pill">Ingredient stories</span>
          </div>
        </div>

        <div className="section">
          <SectionHeading
            eyebrow="Latest reads"
            title="Browse ideas for smoother, softer, more radiant-looking skin."
            description="A calm, friendly place to learn about ingredients, layering order, and routines that feel light and effortless."
          />
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
