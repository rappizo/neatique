import Link from "next/link";
import { HomeBannerSlider } from "@/components/home/home-banner-slider";
import { SocialProofSlider } from "@/components/home/social-proof-slider";
import { PostCard } from "@/components/ui/post-card";
import { ProductCard } from "@/components/ui/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getFeaturedProducts, getPublishedPosts } from "@/lib/queries";

export default async function HomePage() {
  const [products, posts] = await Promise.all([getFeaturedProducts(4), getPublishedPosts(2)]);

  return (
    <>
      <HomeBannerSlider />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Signature collection"
            title="Meet the four Neatique essentials at the heart of the collection."
            description="Each formula is designed to feel elegant, easy to use, and beautiful in a daily routine from morning prep to evening wind-down."
          />
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Loved online"
            title="Creator-led moments that help new shoppers trust the glow."
            description="Watch creators share the texture, finish, and everyday glow they love, then explore the formulas that caught your eye."
          />
          <SocialProofSlider />
        </div>
      </section>

      <section className="section">
        <div className="container cards-3">
          <div className="panel">
            <p className="eyebrow">PDRN Care</p>
            <h3>Daily support for skin that looks tired, dull, or uneven.</h3>
            <p>
              PDRN formulas are loved for the way they fit into modern routines that focus on
              smoothness, bounce, and a healthy-looking glow.
            </p>
          </div>
          <div className="panel">
            <p className="eyebrow">Snail Mucin</p>
            <h3>Comforting hydration with a soft, dewy finish.</h3>
            <p>
              Snail Mucin helps create routines that feel replenishing and easy to wear, especially
              when the skin needs extra softness and moisture.
            </p>
          </div>
          <div className="panel">
            <p className="eyebrow">Why Neatique</p>
            <h3>Bright textures, refined finishes, and simple routines that feel good every day.</h3>
            <p>
              Each formula is presented with clean textures, thoughtful details, and a polished feel
              that suits both first-time shoppers and loyal repeat customers.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="page-hero">
            <p className="eyebrow">Ready For Your Ritual</p>
            <h1>Build a skincare routine that feels soft, polished, and easy to stay consistent with.</h1>
            <p>
              Explore the full Neatique collection, browse ingredient-led beauty tips, and find the
              daily serum or cream that fits your skin best.
            </p>
            <div className="hero-actions">
              <Link href="/shop" className="button button--primary">
                Shop the collection
              </Link>
              <Link href="/beauty-tips" className="button button--secondary">
                Read beauty tips
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Beauty tips"
            title="Simple reads to help you build a routine that feels clear, easy, and enjoyable."
            description="Explore ingredient stories, layering tips, and everyday skincare guidance made to feel approachable and useful."
          />
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
