import Link from "next/link";
import { updateOmbClaimAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { getOmbClaims } from "@/lib/queries";

type AdminOmbClaimsPageProps = {
  searchParams: Promise<{ email?: string; status?: string }>;
};

export default async function AdminOmbClaimsPage({ searchParams }: AdminOmbClaimsPageProps) {
  const params = await searchParams;
  const searchEmail = (params.email || "").trim();
  const claims = await getOmbClaims(searchEmail);

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <p className="eyebrow">OMB Claim</p>
        <h1>Review every OMB claim from order verification through screenshot and gift handling.</h1>
        <p>
          This workspace combines the `/om` and `/om2` submissions into one operations view so the
          team can check platform, rating, address, screenshot, gift status, and internal notes in
          a single place.
        </p>
      </div>

      {params.status ? <p className="notice">OMB claim action completed: {params.status}.</p> : null}

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Claims</h2>
            <p className="form-note">
              {claims.length} claim{claims.length === 1 ? "" : "s"} found.
            </p>
          </div>
          <form method="get" className="admin-inline-form">
            <div className="field">
              <label htmlFor="email">Search email</label>
              <input
                id="email"
                name="email"
                defaultValue={searchEmail}
                placeholder="customer@example.com"
              />
            </div>
            <button type="submit" className="button button--secondary">
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="admin-review-list">
        {claims.length > 0 ? (
          claims.map((claim) => {
            const redirectTo = searchEmail
              ? `/admin/omb-claims?email=${encodeURIComponent(searchEmail)}`
              : "/admin/omb-claims";

            return (
              <section key={claim.id} className="admin-form admin-review-item">
                <div className="admin-review-item__header">
                  <div>
                    <h3>
                      {claim.platformLabel} / {claim.orderId}
                    </h3>
                    <p>
                      {claim.email} / {formatDate(claim.createdAt)} /{" "}
                      {claim.completedAt ? "Step 2 completed" : "Waiting for step 2"}
                    </p>
                  </div>
                  <div className="stack-row">
                    <span className="pill">{claim.platformLabel}</span>
                    {claim.completedAt ? <span className="pill">Completed</span> : <span className="pill">Step 1 only</span>}
                    {claim.giftSent ? <span className="pill">Gift sent</span> : <span className="pill">Gift pending</span>}
                  </div>
                </div>

                <div className="cards-2">
                  <section className="admin-card">
                    <h3>Claim details</h3>
                    <ul className="admin-list">
                      <li>Name: {claim.name}</li>
                      <li>Email: {claim.email}</li>
                      <li>Phone: {claim.phone || "Not provided"}</li>
                      <li>Order ID: {claim.orderId}</li>
                      <li>Product: {claim.purchasedProduct || "Not submitted yet"}</li>
                      <li>Rating: {claim.reviewRating ? `${claim.reviewRating} star` : "Not submitted yet"}</li>
                      <li>
                        Platform link:{" "}
                        {claim.reviewDestinationUrl ? (
                          <a
                            href={claim.reviewDestinationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="link-inline"
                          >
                            Open
                          </a>
                        ) : (
                          "Pending"
                        )}
                      </li>
                    </ul>
                  </section>

                  <section className="admin-card">
                    <h3>Review screenshot</h3>
                    <ul className="admin-list">
                      <li>
                        Image:{" "}
                        {claim.screenshotName ? (
                          <Link
                            href={`/api/omb-claims/${claim.id}/image`}
                            target="_blank"
                            className="link-inline"
                          >
                            View image
                          </Link>
                        ) : (
                          "No image"
                        )}
                      </li>
                      <li>File name: {claim.screenshotName || "No image"}</li>
                      <li>
                        Compressed size:{" "}
                        {claim.screenshotBytes ? `${Math.round(claim.screenshotBytes / 1024)} KB` : "No image"}
                      </li>
                    </ul>
                  </section>
                </div>

                <div className="cards-2">
                  <section className="admin-card">
                    <h3>Customer comment</h3>
                    <p>{claim.commentText || "No comment submitted yet."}</p>
                  </section>

                  <section className="admin-card">
                    <h3>Extra bottle address</h3>
                    <p>{claim.extraBottleAddress || "No address submitted."}</p>
                  </section>
                </div>

                <form action={updateOmbClaimAction} className="contact-form">
                  <input type="hidden" name="id" value={claim.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <label className="field field--checkbox">
                    <input type="checkbox" name="giftSent" defaultChecked={claim.giftSent} />
                    <span>Gift sent</span>
                  </label>
                  <div className="field">
                    <label htmlFor={`admin-note-${claim.id}`}>Note</label>
                    <textarea
                      id={`admin-note-${claim.id}`}
                      name="adminNote"
                      defaultValue={claim.adminNote || ""}
                    />
                  </div>
                  <button type="submit" className="button button--primary">
                    Update claim
                  </button>
                </form>
              </section>
            );
          })
        ) : (
          <section className="admin-form admin-review-item">
            <h3>No claims found</h3>
            <p>Try a different email search or wait for new OMB submissions to arrive.</p>
          </section>
        )}
      </div>
    </div>
  );
}
