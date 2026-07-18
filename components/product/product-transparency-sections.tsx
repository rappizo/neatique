import { ProductCard } from "@/components/ui/product-card";
import { siteConfig } from "@/lib/site-config";
import {
  buildProductFaqs,
  buildProductRoutine,
  formatProductOrigin,
  splitProductFacts
} from "@/lib/product-transparency";
import type { ProductRecord } from "@/lib/types";

type ProductTransparencySectionsProps = {
  product: ProductRecord;
  relatedProducts: ProductRecord[];
  showFaq?: boolean;
};

export function ProductTransparencySections({
  product,
  relatedProducts,
  showFaq = true
}: ProductTransparencySectionsProps) {
  const origin = formatProductOrigin(product.countryOfOrigin);
  const keyIngredients = splitProductFacts(product.keyIngredientDetails);
  const routine = buildProductRoutine(product);
  const faqs = buildProductFaqs(product);

  return (
    <>
      <section className="product-page-section" id="product-facts">
        <div className="section-heading">
          <p className="section-heading__eyebrow">Product transparency</p>
          <h2>Verified manufacturing and routine information.</h2>
          <p>
            These facts come from the Neatique product record. Unverified details are left blank
            until they can be copied from the packaging or manufacturing documentation.
          </p>
        </div>
        <div className="cards-3">
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
                {keyIngredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}
              </ul>
            ) : <p>Verified key-ingredient details are being added from manufacturing records.</p>}
            {product.pdrnSource ? <p><strong>PDRN source/type:</strong> {product.pdrnSource}</p> : null}
          </article>
          <article className="panel">
            <h3>Skin fit & cautions</h3>
            {product.suitableFor ? <p><strong>Suitable for:</strong> {product.suitableFor}</p> : null}
            {product.cautionFor ? <p><strong>Use caution:</strong> {product.cautionFor}</p> : null}
            <p>Patch test before broader use. Stop use if irritation develops.</p>
          </article>
        </div>
        <article className="panel product-inci-panel">
          <h3>Full INCI ingredient list</h3>
          {product.ingredients ? (
            <p>{product.ingredients}</p>
          ) : (
            <p>
              The packaging-verified INCI list has not yet been uploaded to this page. Contact{" "}
              <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a> if you
              need the current list before ordering.
            </p>
          )}
        </article>
      </section>

      {product.textureVideoUrl ? (
        <section className="product-page-section">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Texture & application</p>
            <h2>See the product texture and finish in use.</h2>
          </div>
          <video className="product-texture-video" controls preload="metadata" playsInline>
            <source src={product.textureVideoUrl} />
            Your browser does not support embedded video.
          </video>
        </section>
      ) : null}

      <section className="product-page-section" id="how-to-use">
        <div className="section-heading">
          <p className="section-heading__eyebrow">AM / PM routine</p>
          <h2>Where {product.name} fits in your routine.</h2>
          <p>Introduce one unfamiliar product at a time and follow the directions on the packaging.</p>
        </div>
        <div className="cards-2">
          <article className="panel">
            <p className="eyebrow">Morning</p>
            <h3>AM order</h3>
            <ol className="detail-list">
              {routine.am.map((step) => <li key={step.title}><strong>{step.title}</strong><br />{step.body}</li>)}
            </ol>
          </article>
          <article className="panel">
            <p className="eyebrow">Evening</p>
            <h3>PM order</h3>
            <ol className="detail-list">
              {routine.pm.map((step) => <li key={step.title}><strong>{step.title}</strong><br />{step.body}</li>)}
            </ol>
          </article>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="product-page-section">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Compare related products</p>
            <h2>Choose by texture, routine step and use intent.</h2>
            <p>Compare a small set of related Neatique formulas instead of stacking overlapping products.</p>
          </div>
          <div className="product-grid product-grid--related">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      ) : null}

      {showFaq ? (
        <section className="product-page-section" id="faq">
          <div className="section-heading">
            <p className="section-heading__eyebrow">Frequently asked questions</p>
            <h2>Useful answers before you add this product to your routine.</h2>
          </div>
          <div className="cards-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="panel">
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
