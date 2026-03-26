import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HomeBannerSlider } from "@/components/home/home-banner-slider";
import { SocialProofSlider } from "@/components/home/social-proof-slider";
import { PostCard } from "@/components/ui/post-card";
import { ProductCard } from "@/components/ui/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getFeaturedProducts, getPublishedPosts } from "@/lib/queries";
import { siteConfig } from "@/lib/site-config";
import { buildSiteImageUrl } from "@/lib/site-media";

const homePageTitle = "Professional Skincare for Smooth, Hydrated, Radiant Skin";
const homePageDescription =
  "Discover Neatique Beauty, a professional skincare collection built around PDRN and Snail Mucin essentials for glow, comfort, hydration, and refined daily rituals in the United States.";

const homeImages = {
  signature: {
    src: buildSiteImageUrl("home", "Signature Brand Campaign.png"),
    alt: "Neatique skincare arranged in a warm signature campaign still life.",
    width: 800,
    height: 800
  },
  morning: {
    src: buildSiteImageUrl("home", "Morning Vanity Scene.png"),
    alt: "Neatique products styled on a vanity for a bright morning skincare ritual.",
    width: 800,
    height: 800
  },
  lifestyle: {
    src: buildSiteImageUrl("home", "Brand Lifestyle Moment.png"),
    alt: "Neatique skincare featured in a soft lifestyle campaign moment.",
    width: 800,
    height: 800
  },
  texture: {
    src: buildSiteImageUrl("home", "Texture Close-Up.png"),
    alt: "Close-up texture view of Neatique skincare with a smooth, glossy finish.",
    width: 800,
    height: 800
  },
  ritual: {
    src: buildSiteImageUrl("home", "Refined Sink-Side Ritual.png"),
    alt: "Neatique skincare arranged beside a sink for an elevated daily ritual.",
    width: 800,
    height: 800
  },
  application: {
    src: buildSiteImageUrl("home", "Application Close-UP.png"),
    alt: "Close-up of Neatique skincare application for a soft, hydrated finish.",
    width: 800,
    height: 800
  },
  pdrn: {
    src: buildSiteImageUrl("home", "PDRN Editorial Still Life.png"),
    alt: "PDRN skincare products styled in a polished editorial still life.",
    width: 800,
    height: 800
  },
  snail: {
    src: buildSiteImageUrl("home", "Snail Mucin Texture Story.png"),
    alt: "Snail mucin skincare styled to highlight a dewy, replenishing texture story.",
    width: 800,
    height: 800
  },
  evening: {
    src: buildSiteImageUrl("home", "Soft Evening Brand Moment.png"),
    alt: "Neatique skincare styled in a soft evening brand moment with a calm glow.",
    width: 1071,
    height: 800
  }
};

const brandPillars = [
  {
    eyebrow: "Professional Feel",
    title: "Skincare that looks polished on the vanity and effortless in daily life.",
    description:
      "Neatique focuses on elevated textures, easy layering, and a refined finish that never feels overworked."
  },
  {
    eyebrow: "Comfort First",
    title: "Every serum and cream is built to help skin feel calm, cushioned, and cared for.",
    description:
      "The collection is designed for women who want hydration, softness, and glow without a complicated routine."
  },
  {
    eyebrow: "Ritual Ready",
    title: "A four-piece collection made to work from first step to final layer.",
    description:
      "Use the formulas on their own or pair them together for a morning-to-evening rhythm that stays easy to maintain."
  }
];

const routineSteps = [
  {
    step: "01",
    title: "Start with a serum that feels fresh and weightless",
    description:
      "Use a lightweight layer first to bring in hydration and help the rest of the routine sit beautifully on the skin."
  },
  {
    step: "02",
    title: "Choose the finish your skin is asking for",
    description:
      "Reach for PDRN when you want bounce and a polished glow, or Snail Mucin when you want soft, replenishing comfort."
  },
  {
    step: "03",
    title: "Seal everything in with a cream that stays elegant",
    description:
      "Finish with a cream texture that helps skin feel smooth, nourished, and ready for the rest of the day or night."
  }
];

const ingredientStories = [
  {
    eyebrow: "PDRN Ritual",
    title: "For skin that looks smooth, rested, and quietly luminous.",
    description:
      "Our PDRN pairing is made for women who want their routine to feel polished while helping the complexion look fresher and more refined.",
    image: homeImages.pdrn
  },
  {
    eyebrow: "Snail Mucin Ritual",
    title: "For comfort, hydration, and a soft dewy finish that lasts.",
    description:
      "The Snail Mucin duo is ideal for routines that need cushion, replenishing moisture, and a more supple-looking glow.",
    image: homeImages.snail
  }
];

export const metadata: Metadata = {
  title: homePageTitle,
  description: homePageDescription,
  alternates: {
    canonical: "/"
  },
  keywords: [
    "Neatique Beauty",
    "professional skincare",
    "PDRN cream",
    "PDRN serum",
    "snail mucin cream",
    "snail mucin serum",
    "hydrating skincare",
    "glow skincare",
    "United States skincare brand"
  ],
  openGraph: {
    title: `${homePageTitle} | ${siteConfig.title}`,
    description: homePageDescription,
    url: "/",
    type: "website",
    images: [
      {
        url: homeImages.signature.src,
        width: homeImages.signature.width,
        height: homeImages.signature.height,
        alt: homeImages.signature.alt
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${homePageTitle} | ${siteConfig.title}`,
    description: homePageDescription,
    images: [homeImages.signature.src]
  }
};

export default async function HomePage() {
  const [products, posts] = await Promise.all([getFeaturedProducts(4), getPublishedPosts(2)]);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.title,
        url: siteConfig.url,
        description: homePageDescription,
        email: siteConfig.supportEmail,
        telephone: siteConfig.phone,
        areaServed: "US",
        image: `${siteConfig.url}${homeImages.signature.src}`
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.title,
        description: homePageDescription,
        publisher: {
          "@id": `${siteConfig.url}/#organization`
        }
      },
      {
        "@type": "CollectionPage",
        "@id": `${siteConfig.url}/#homepage`,
        url: siteConfig.url,
        name: homePageTitle,
        description: homePageDescription,
        isPartOf: {
          "@id": `${siteConfig.url}/#website`
        },
        about: {
          "@id": `${siteConfig.url}/#organization`
        },
        primaryImageOfPage: `${siteConfig.url}${homeImages.signature.src}`
      },
      {
        "@type": "ItemList",
        name: "Featured skincare products",
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.name,
          url: `${siteConfig.url}/shop/${product.slug}`
        }))
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <HomeBannerSlider />

      <section className="section">
        <div className="container">
          <div className="brand-manifesto">
            <div className="brand-manifesto__copy">
              <p className="eyebrow">Neatique Beauty</p>
              <h1 className="brand-manifesto__title">
                Professional skincare for smooth, hydrated, glow-ready skin.
              </h1>
              <p className="brand-manifesto__lead">
                Neatique blends elegant textures with modern simplicity so women can build a ritual
                that feels polished, calming, and easy to return to every day.
              </p>
              <div className="brand-manifesto__pills">
                <span className="pill">United States shipping</span>
                <span className="pill">PDRN and Snail Mucin essentials</span>
                <span className="pill">Serums and creams for daily routines</span>
              </div>
              <p className="brand-manifesto__note">
                From first layer to final finish, every formula is meant to support skin comfort,
                refined texture, and a healthy-looking glow that fits naturally into real life.
              </p>
              <div className="hero-actions">
                <Link href="/shop" className="button button--primary">
                  Shop the collection
                </Link>
                <Link href="/beauty-tips" className="button button--secondary">
                  Explore beauty tips
                </Link>
              </div>
            </div>

            <div className="home-image home-image--square home-image--hero">
              <Image
                src={homeImages.signature.src}
                alt={homeImages.signature.alt}
                width={homeImages.signature.width}
                height={homeImages.signature.height}
                sizes="(max-width: 1080px) 100vw, 44vw"
                quality={84}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Signature Collection"
            title="Four core essentials created for brighter, softer, more confident skin days."
            description="Meet the PDRN and Snail Mucin formulas that anchor the Neatique collection, from fresh serum layers to comforting cream finishes."
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
          <div className="philosophy-band">
            <div className="philosophy-band__hero">
              <div className="philosophy-band__intro">
                <p className="eyebrow">Brand Philosophy</p>
                <h2>Luxury in feel, clarity in routine, and comfort in every layer.</h2>
                <p>
                  Neatique is built for women who want skincare to feel elevated without feeling
                  complicated. The brand philosophy centers on glow, softness, visual polish, and a
                  ritual that still makes sense on busy mornings and calm evenings alike.
                </p>
              </div>

              <div className="home-mosaic">
                <div className="home-image home-image--square home-mosaic__feature">
                  <Image
                    src={homeImages.morning.src}
                    alt={homeImages.morning.alt}
                    width={homeImages.morning.width}
                    height={homeImages.morning.height}
                    sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 26vw"
                    quality={82}
                  />
                </div>
                <div className="home-mosaic__stack">
                  <div className="home-image home-image--square">
                    <Image
                      src={homeImages.lifestyle.src}
                      alt={homeImages.lifestyle.alt}
                      width={homeImages.lifestyle.width}
                      height={homeImages.lifestyle.height}
                      sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 18vw"
                      quality={82}
                    />
                  </div>
                  <div className="home-image home-image--square">
                    <Image
                      src={homeImages.texture.src}
                      alt={homeImages.texture.alt}
                      width={homeImages.texture.width}
                      height={homeImages.texture.height}
                      sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 18vw"
                      quality={82}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="philosophy-band__grid">
              {brandPillars.map((pillar) => (
                <article key={pillar.eyebrow} className="panel philosophy-card">
                  <p className="eyebrow">{pillar.eyebrow}</p>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="ritual-spotlight">
            <div className="ritual-spotlight__hero">
              <div className="ritual-spotlight__content">
                <SectionHeading
                  eyebrow="Designed For Daily Rituals"
                  title="A simple three-step rhythm that keeps skincare feeling calm, clear, and luxurious."
                  description="Whether the routine starts at a busy vanity or ends with a quiet evening reset, Neatique is designed to keep each step intuitive and beautiful to use."
                />
              </div>
              <div className="ritual-spotlight__media">
                <div className="home-image home-image--square">
                  <Image
                    src={homeImages.ritual.src}
                    alt={homeImages.ritual.alt}
                    width={homeImages.ritual.width}
                    height={homeImages.ritual.height}
                    sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 24vw"
                    quality={82}
                  />
                </div>
                <div className="home-image home-image--square">
                  <Image
                    src={homeImages.application.src}
                    alt={homeImages.application.alt}
                    width={homeImages.application.width}
                    height={homeImages.application.height}
                    sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 20vw"
                    quality={82}
                  />
                </div>
              </div>
            </div>

            <div className="ritual-steps ritual-steps--grid">
              {routineSteps.map((step) => (
                <article key={step.step} className="panel ritual-step">
                  <span className="ritual-step__index">{step.step}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Loved Online"
            title="Real creator moments that help shoppers picture the texture, glow, and finish."
            description="See the formulas in motion, then move straight into the products that match the skin feel you want to build into your routine."
          />
          <SocialProofSlider />
        </div>
      </section>

      <section className="section">
        <div className="container ingredient-story-grid">
          {ingredientStories.map((story) => (
            <article key={story.eyebrow} className="ingredient-story panel">
              <div className="home-image home-image--square">
                <Image
                  src={story.image.src}
                  alt={story.image.alt}
                  width={story.image.width}
                  height={story.image.height}
                  sizes="(max-width: 1080px) 100vw, 44vw"
                  quality={82}
                />
              </div>
              <div className="ingredient-story__copy">
                <p className="eyebrow">{story.eyebrow}</p>
                <h3>{story.title}</h3>
                <p>{story.description}</p>
                <Link href="/shop" className="link-inline">
                  Explore the shop
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Beauty Tips"
            title="Routine guidance made to feel useful, clear, and easy to come back to."
            description="Discover ingredient explainers, layering ideas, and practical skincare notes designed to help women get more from every step of the ritual."
          />
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="home-cta">
            <div className="home-cta__copy">
              <p className="eyebrow">Ready For Your Ritual</p>
              <h2>Find the serum and cream pairing that makes your routine feel softer, brighter, and more refined.</h2>
              <p>
                Explore the Neatique collection, build a cart around the texture your skin is
                asking for, and create a daily ritual that feels polished without feeling heavy.
              </p>
              <div className="hero-actions">
                <Link href="/shop" className="button button--primary">
                  Shop Neatique
                </Link>
                <Link href="/contact" className="button button--secondary">
                  Contact the team
                </Link>
              </div>
            </div>

            <div className="home-image home-image--landscape">
              <Image
                src={homeImages.evening.src}
                alt={homeImages.evening.alt}
                width={homeImages.evening.width}
                height={homeImages.evening.height}
                sizes="(max-width: 1080px) 100vw, 48vw"
                quality={84}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
