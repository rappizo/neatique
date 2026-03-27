import Link from "next/link";

type PolicySection = {
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

type PolicyHighlight = {
  title: string;
  description: string;
};

type PolicyPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats: readonly string[];
  sections: readonly PolicySection[];
  highlights: readonly PolicyHighlight[];
};

export function PolicyPage({
  eyebrow,
  title,
  description,
  stats,
  sections,
  highlights
}: PolicyPageProps) {
  return (
    <section className="section">
      <div className="container policy-shell">
        <div className="page-hero">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="page-hero__stats">
            {stats.map((stat) => (
              <span key={stat} className="pill">
                {stat}
              </span>
            ))}
          </div>
        </div>

        <div className="policy-layout">
          <div className="policy-sections">
            {sections.map((section) => (
              <article key={section.title} className="panel policy-section">
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets?.length ? (
                  <ul className="policy-list">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>

          <aside className="policy-sidebar">
            <div className="panel policy-sidebar__panel">
              <p className="eyebrow">Quick Notes</p>
              <div className="policy-highlights">
                {highlights.map((highlight) => (
                  <div key={highlight.title} className="policy-highlight">
                    <h3>{highlight.title}</h3>
                    <p>{highlight.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel policy-sidebar__panel">
              <p className="eyebrow">Need Help?</p>
              <p>
                If you have an order question or need support with your skincare routine, our team
                is here to help.
              </p>
              <div className="hero-actions">
                <Link href="/contact" className="button button--primary">
                  Contact us
                </Link>
                <Link href="/shop" className="button button--secondary">
                  Shop now
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
