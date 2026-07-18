import { ProductCard } from "@/components/ui/product-card";
import { siteConfig } from "@/lib/site-config";
import {
  buildProductFaqs,
  buildProductRoutine,
  formatProductOrigin,
  splitProductFacts
} from "@/lib/product-transparency";
import type { ProductRecord } from "@/lib/types";

type ProductSectionProps = {
  product: ProductRecord;
};

type ProductFaqSectionProps = ProductSectionProps & {
  faqs?: ReadonlyArray<{ question: string; answer: string }>;
};

type ProductRelatedProductsSectionProps = {
  relatedProducts: ProductRecord[];
};

export function ProductTextureVideoSection({ product }: ProductSectionProps) {
  if (!product.textureVideoUrl) {
    return null;
  }

  return (
    <section className="product-page-section product-page-section--centered">
      <div className="section-heading">
        <p className="section-heading__eyebrow">Texture & application</p>
        <h2>See the product texture and finish in use.</h2>
      </div>
      <video className="product-texture-video" controls preload="metadata" playsInline>
        <source src={product.textureVideoUrl} />
        Your browser does not support embedded video.
      </video>
    </section>
  );
}

export function ProductRoutineSection({ product }: ProductSectionProps) {
  const routine = buildProductRoutine(product);

  return (
    <section className="product-page-section product-page-section--centered" id="how-to-use">
      <div className="section-heading">
        <p className="section-heading__eyebrow">AM / PM routine</p>
        <h2>Where {product.name} fits in your morning and evening routine.</h2>
        <p className="section-heading__description">
          Introduce one unfamiliar product at a time and follow the directions on the packaging.
        </p>
      </div>
      <div className="cards-2 product-routine-cards">
        <article className="panel">
          <p className="eyebrow">Morning</p>
          <h3>AM order</h3>
          <ol className="detail-list">
            {routine.am.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <br />
                {step.body}
              </li>
            ))}
          </ol>
        </article>
        <article className="panel">
          <p className="eyebrow">Evening</p>
          <h3>PM order</h3>
          <ol className="detail-list">
            {routine.pm.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <br />
                {step.body}
              </li>
            ))}
          </ol>
        </article>
      </div>
    </section>
  );
}

export function ProductFaqSection({ product, faqs }: ProductFaqSectionProps) {
  const items = faqs ?? buildProductFaqs(product);

  return (
    <section className="product-page-section product-page-section--centered" id="faq">
      <div className="section-heading">
        <p className="section-heading__eyebrow">FAQ</p>
        <h2>Useful answers before you add this product to your routine.</h2>
      </div>
      <div className="cards-2 product-faq-grid">
        {items.map((faq) => (
          <article key={faq.question} className="panel">
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProductTransparencySection({ product }: ProductSectionProps) {
  const origin = formatProductOrigin(product.countryOfOrigin);
  const keyIngredients = splitProductFacts(product.keyIngredientDetails);

  return (
    <section
      className="product-page-section product-page-section--centered"
      id="product-facts"
    >
      <div className="section-heading">
        <p className="section-heading__eyebrow">Product transparency</p>
        <h2>Verified manufacturing, formula and suitability information.</h2>
        <p className="section-heading__description">
          These facts come from the Neatique product record. Unverified details remain blank until
          they can be copied from packaging or manufacturing documentation.
        </p>
      </div>
      <div className="cards-3 product-transparency-grid">
        <article className="panel">
          <h3>Identity & origin</h3>
          <ul className="detail-list">
            <li>SKU / manufacturer MPN: {product.productCode}</li>
            {origin ? <li>Country of origin: {origin}</li> : null}
            {product.netContent ? <li>Net content: {product.netContent}</li> : null}
            {product.batchExpiryInfo ? <li>{product.batchExpiryInfo}</li> : null}
          </ul>
        </article>
        <article className="panel">
          <h3>Formula facts</h3>
          {keyIngredients.length > 0 ? (
            <ul className="detail-list">
              {keyIngredients.map((ingredient) => (
                <li key={ingredient}>{ingredient}</li>
              ))}
            </ul>
          ) : (
            <p>Verified key-ingredient details are being added from manufacturing records.</p>
          )}
          {product.pdrnSource ? (
            <p>
              <strong>PDRN source/type:</strong> {product.pdrnSource}
            </p>
          ) : null}
        </article>
        <article className="panel">
          <h3>Skin fit & cautions</h3>
          {product.suitableFor ? (
            <p>
              <strong>Suitable for:</strong> {product.suitableFor}
            </p>
          ) : null}
          {product.cautionFor ? (
            <p>
              <strong>Use caution:</strong> {product.cautionFor}
            </p>
          ) : null}
          <p>Patch test before broader use. Stop use if irritation develops.</p>
        </article>
      </div>
      <article className="panel product-inci-panel product-inci-panel--centered">
        <h3>Full INCI ingredient list</h3>
        {product.ingredients ? (
          <p>{product.ingredients}</p>
        ) : (
          <p>
            The packaging-verified INCI list has not yet been uploaded to this page. Contact{" "}
            <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a> if you need
            the current list before ordering.
          </p>
        )}
      </article>
    </section>
  );
}

export function ProductRelatedProductsSection({
  relatedProducts
}: ProductRelatedProductsSectionProps) {
  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="product-page-section product-page-section--centered">
      <div className="section-heading">
        <p className="section-heading__eyebrow">Related products</p>
        <h2>Compare by texture, routine step and use intent.</h2>
        <p className="section-heading__description">
          Compare a focused set of Neatique formulas without stacking overlapping products.
        </p>
      </div>
      <div className="product-grid product-grid--related">
        {relatedProducts.map((relatedProduct) => (
          <ProductCard key={relatedProduct.id} product={relatedProduct} />
        ))}
      </div>
    </section>
  );
}
