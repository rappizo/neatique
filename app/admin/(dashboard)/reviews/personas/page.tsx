import Link from "next/link";
import { createReviewPersonaAction } from "@/app/admin/actions";
import { PendingSubmitButton } from "@/components/admin/pending-submit-button";
import { formatDate } from "@/lib/format";
import { getAdminReviewPersonaPage } from "@/lib/review-personas";

type AdminReviewPersonasPageProps = {
  searchParams: Promise<{ status?: string; page?: string; perPage?: string }>;
};

const personaFieldDefaults = {
  ageRange: "30-34",
  ethnicity: "Mixed race",
  occupation: "marketing coordinator",
  incomeLevel: "comfortable 70k-100k household",
  location: "Austin, TX",
  personality: "detail-oriented and careful",
  bodyType: "average build",
  skinType: "combination skin",
  skinConcern: "uneven tone",
  lifestyle: "hybrid office days and weekend errands",
  shoppingMotivation: "buys after comparing reviews and routine videos",
  priceSensitivity: "balanced value seeker",
  productPreference: "makeup-friendly finishes",
  writingStyle: "balanced paragraph with a clear first impression and result",
  reviewTone: "calm positive",
  routineLevel: "ingredient-aware intermediate routine",
  socialChannel: "TikTok beauty browser",
  lifeStage: "career-building"
};

const suggestedTags = [
  "age range",
  "occupation",
  "income level",
  "skin type",
  "skin concern",
  "routine level",
  "price sensitivity",
  "writing habit",
  "review tone",
  "product preference",
  "social channel",
  "life stage",
  "body type",
  "shopping motivation",
  "location and climate"
];

function buildStatusMessage(status?: string) {
  if (status === "persona-created") {
    return "User Image profile created.";
  }

  if (status === "missing-fields") {
    return "Fill every required User Image field before creating the profile.";
  }

  return status ? `User Image action completed: ${status}.` : null;
}

function clipText(value: string, maxLength = 150) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;
}

export default async function AdminReviewPersonasPage({
  searchParams
}: AdminReviewPersonasPageProps) {
  const params = await searchParams;
  const page = await getAdminReviewPersonaPage({
    page: params.page,
    perPage: params.perPage
  });
  const statusMessage = buildStatusMessage(params.status);
  const firstShown = page.totalCount === 0 ? 0 : (page.currentPage - 1) * page.perPage + 1;
  const lastShown = Math.min(page.currentPage * page.perPage, page.totalCount);
  const pageSizeOptions = [20, 50];
  const buildPersonaPageHref = (pageNumber: number, perPage = page.perPage) => {
    const query = new URLSearchParams();

    if (pageNumber > 1) {
      query.set("page", String(pageNumber));
    }

    if (perPage !== 20) {
      query.set("perPage", String(perPage));
    }

    const queryString = query.toString();
    return `/admin/reviews/personas${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">Reviews / User Images</p>
        <h1>Build the customer voices used by AI review drafts.</h1>
        <p>
          Each User Image is a named buyer profile with demographics, routine habits, budget
          sensitivity, writing style, and future lifestyle image fields.
        </p>
      </div>

      <div className="stack-row">
        <Link href="/admin/reviews" className="button button--secondary">
          Back to Review Products
        </Link>
        <span className="pill">{page.totalCount} profiles</span>
        <span className="pill">{page.activeCount} active</span>
        <span className="pill">{page.reviewCount} linked reviews</span>
      </div>

      {statusMessage ? <p className="notice">{statusMessage}</p> : null}

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Add User Image</h2>
            <p className="form-note">
              New profiles are active immediately and can be selected by future AI review
              generation.
            </p>
          </div>
          <span className="pill">{page.defaultCount} default profiles seeded</span>
        </div>

        <form action={createReviewPersonaAction} className="admin-form">
          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="personaFullName">Full name</label>
              <input id="personaFullName" name="fullName" placeholder="Maya Bennett" required />
            </div>
            <div className="field">
              <label htmlFor="personaAge">Age</label>
              <input id="personaAge" name="age" type="number" min="18" max="85" defaultValue="32" required />
            </div>
            <div className="field">
              <label htmlFor="personaAgeRange">Age range</label>
              <input id="personaAgeRange" name="ageRange" defaultValue={personaFieldDefaults.ageRange} required />
            </div>
            <div className="field">
              <label htmlFor="personaEthnicity">Ethnicity</label>
              <input id="personaEthnicity" name="ethnicity" defaultValue={personaFieldDefaults.ethnicity} required />
            </div>
            <div className="field">
              <label htmlFor="personaOccupation">Occupation</label>
              <input id="personaOccupation" name="occupation" defaultValue={personaFieldDefaults.occupation} required />
            </div>
            <div className="field">
              <label htmlFor="personaIncomeLevel">Income level</label>
              <input id="personaIncomeLevel" name="incomeLevel" defaultValue={personaFieldDefaults.incomeLevel} required />
            </div>
            <div className="field">
              <label htmlFor="personaLocation">Location</label>
              <input id="personaLocation" name="location" defaultValue={personaFieldDefaults.location} required />
            </div>
            <div className="field">
              <label htmlFor="personaBodyType">Body type</label>
              <input id="personaBodyType" name="bodyType" defaultValue={personaFieldDefaults.bodyType} required />
            </div>
            <div className="field">
              <label htmlFor="personaSkinType">Skin type</label>
              <input id="personaSkinType" name="skinType" defaultValue={personaFieldDefaults.skinType} required />
            </div>
            <div className="field">
              <label htmlFor="personaSkinConcern">Skin concern</label>
              <input id="personaSkinConcern" name="skinConcern" defaultValue={personaFieldDefaults.skinConcern} required />
            </div>
            <div className="field">
              <label htmlFor="personaPersonality">Personality</label>
              <input id="personaPersonality" name="personality" defaultValue={personaFieldDefaults.personality} required />
            </div>
            <div className="field">
              <label htmlFor="personaLifeStage">Life stage</label>
              <input id="personaLifeStage" name="lifeStage" defaultValue={personaFieldDefaults.lifeStage} required />
            </div>
            <div className="field">
              <label htmlFor="personaLifestyle">Lifestyle</label>
              <input id="personaLifestyle" name="lifestyle" defaultValue={personaFieldDefaults.lifestyle} required />
            </div>
            <div className="field">
              <label htmlFor="personaShoppingMotivation">Shopping motivation</label>
              <input id="personaShoppingMotivation" name="shoppingMotivation" defaultValue={personaFieldDefaults.shoppingMotivation} required />
            </div>
            <div className="field">
              <label htmlFor="personaPriceSensitivity">Price sensitivity</label>
              <input id="personaPriceSensitivity" name="priceSensitivity" defaultValue={personaFieldDefaults.priceSensitivity} required />
            </div>
            <div className="field">
              <label htmlFor="personaProductPreference">Product preference</label>
              <input id="personaProductPreference" name="productPreference" defaultValue={personaFieldDefaults.productPreference} required />
            </div>
            <div className="field">
              <label htmlFor="personaWritingStyle">Writing habit</label>
              <input id="personaWritingStyle" name="writingStyle" defaultValue={personaFieldDefaults.writingStyle} required />
            </div>
            <div className="field">
              <label htmlFor="personaReviewTone">Review tone</label>
              <input id="personaReviewTone" name="reviewTone" defaultValue={personaFieldDefaults.reviewTone} required />
            </div>
            <div className="field">
              <label htmlFor="personaRoutineLevel">Routine level</label>
              <input id="personaRoutineLevel" name="routineLevel" defaultValue={personaFieldDefaults.routineLevel} required />
            </div>
            <div className="field">
              <label htmlFor="personaSocialChannel">Social channel</label>
              <input id="personaSocialChannel" name="socialChannel" defaultValue={personaFieldDefaults.socialChannel} required />
            </div>
          </div>

          <div className="admin-form__grid">
            <div className="field">
              <label htmlFor="personaTags">Extra tags</label>
              <textarea id="personaTags" name="tags" placeholder="climate-sensitive&#10;texture-focused" />
            </div>
            <div className="field">
              <label htmlFor="personaNotes">Voice notes</label>
              <textarea id="personaNotes" name="notes" placeholder="How this person should sound when writing a product review." />
            </div>
            <div className="field">
              <label htmlFor="personaLifeImagePrompt">Life image prompt</label>
              <textarea id="personaLifeImagePrompt" name="lifeImagePrompt" placeholder="Optional prompt for a future lifestyle photo." />
            </div>
            <div className="field">
              <label htmlFor="personaLifeImageUrl">Life image URL</label>
              <input id="personaLifeImageUrl" name="lifeImageUrl" placeholder="https://..." />
            </div>
          </div>

          <PendingSubmitButton
            idleLabel="Create User Image"
            pendingLabel="Creating User Image..."
            modalTitle="Creating User Image"
            modalDescription="The new buyer profile is being saved to the review persona pool."
          />
        </form>
      </section>

      <section className="admin-form">
        <h2>Suggested segmentation tags</h2>
        <div className="stack-row stack-row--wrap">
          {suggestedTags.map((tag) => (
            <span key={tag} className="pill">
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>User Image list</h2>
            <p className="form-note">
              Profiles are shown as compact rows with the key segmentation tags, review voice,
              linked product comments, and future lifestyle image status.
            </p>
          </div>
          <div className="stack-row stack-row--wrap">
            <span className="pill">
              {firstShown}-{lastShown} of {page.totalCount}
            </span>
            <span className="pill">
              Page {page.currentPage} of {page.pageCount}
            </span>
            {pageSizeOptions.map((option) => (
              <Link
                key={option}
                href={buildPersonaPageHref(1, option)}
                className={`button button--compact ${
                  page.perPage === option ? "button--primary" : "button--secondary"
                }`}
              >
                {option} / page
              </Link>
            ))}
          </div>
        </div>

        <div className="review-persona-list">
          {page.personas.map((persona) => {
            const tags = [
              persona.ethnicity,
              persona.occupation,
              persona.incomeLevel,
              persona.bodyType,
              persona.skinType,
              persona.skinConcern,
              persona.productPreference
            ];
            const voiceSummary = [
              persona.personality,
              persona.writingStyle,
              persona.reviewTone,
              persona.routineLevel,
              persona.socialChannel
            ].join(" / ");

            return (
              <article key={persona.id} className="review-persona-list__item">
                <div className="review-persona-list__identity">
                  <div>
                    <p className="eyebrow">User Image</p>
                    <h3>{persona.fullName}</h3>
                    <p>
                      {persona.age} / {persona.ageRange} / {persona.location}
                    </p>
                  </div>
                  <div className="stack-row stack-row--wrap">
                    <span className="pill">{persona.active ? "Active" : "Inactive"}</span>
                    <span className="pill">{persona.reviewCount} linked reviews</span>
                  </div>
                </div>

                <div className="review-persona-list__tags">
                  {tags.map((tag) => (
                    <span key={tag} className="pill">
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="review-persona-list__voice">{voiceSummary}</p>

                <div className="review-persona-list__footer">
                  <div className="review-persona-list__summary">
                    <strong>Linked product reviews</strong>
                    {persona.recentReviews.length > 0 ? (
                      <div className="review-persona-review-list">
                        {persona.recentReviews.slice(0, 2).map((review) => (
                          <div key={review.id} className="review-persona-review-list__item">
                            <div className="review-persona-review-list__header">
                              <Link href={`/admin/reviews/${review.productSlug}`} className="text-link">
                                {review.productName}
                              </Link>
                              <span className="form-note">
                                {review.rating} stars / {review.status} / {formatDate(review.reviewDate)}
                              </span>
                            </div>
                            <p>
                              <strong>{review.title}</strong> {clipText(review.content)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="form-note">No linked reviews yet.</p>
                    )}
                  </div>

                  <div className="review-persona-list__summary">
                    <strong>Life image</strong>
                    {persona.lifeImageUrl ? (
                      <Link href={persona.lifeImageUrl} className="text-link">
                        Open image
                      </Link>
                    ) : (
                      <p className="form-note">
                        {persona.lifeImagePrompt ? "Prompt ready for future image generation." : "No life image yet."}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="admin-review-pagination">
          <div className="stack-row stack-row--wrap">
            {page.hasPreviousPage ? (
              <Link
                href={buildPersonaPageHref(page.currentPage - 1)}
                className="button button--secondary button--compact"
              >
                Previous
              </Link>
            ) : (
              <span className="button button--secondary button--compact" aria-disabled="true">
                Previous
              </span>
            )}
            {page.hasNextPage ? (
              <Link
                href={buildPersonaPageHref(page.currentPage + 1)}
                className="button button--secondary button--compact"
              >
                Next
              </Link>
            ) : (
              <span className="button button--secondary button--compact" aria-disabled="true">
                Next
              </span>
            )}
          </div>
          <span className="pill">
            Showing {firstShown}-{lastShown} of {page.totalCount} User Images
          </span>
        </div>
      </section>
    </div>
  );
}
