import Link from "next/link";
import Image from "next/image";
import { deleteComicImageCreationAction } from "@/app/admin/comic-image-creation-actions";
import {
  ComicImageCreationQueueForm,
  ComicImageCreationUseReferenceButton,
  ComicImageTaskQueueProvider,
  type ComicImageCreationReferenceOption
} from "@/components/admin/comic-image-task-queue";
import {
  COMIC_IMAGE_CREATION_ASPECT_RATIOS,
  COMIC_IMAGE_CREATION_QUALITIES,
  getComicImageCreationAspectRatioValue,
  getComicImageCreationQualityLabel,
  listComicImageCreations
} from "@/lib/comic-image-creation";
import { formatDate } from "@/lib/format";
import { getOpenAiComicSettings } from "@/lib/openai-comic";

export default async function AdminComicImageCreationPage() {
  const [images, openAiSettings] = await Promise.all([
    listComicImageCreations(36),
    Promise.resolve(getOpenAiComicSettings())
  ]);
  const referenceImages: ComicImageCreationReferenceOption[] = images.map((image) => ({
    id: image.id,
    imageUrl: image.imageUrl,
    prompt: image.prompt,
    aspectRatio: image.aspectRatio,
    model: image.model,
    createdAt: image.createdAt.toISOString()
  }));

  return (
    <ComicImageTaskQueueProvider maxConcurrent={5}>
      <div className="admin-page admin-page--comic-image-creation">
        <div className="stack-row">
          <Link href="/admin/comic" className="button button--secondary">
            Back to comic
          </Link>
          <Link href="/admin/comic/publish-center" className="button button--ghost">
            Publish Center
          </Link>
        </div>

        <div className="admin-page__header">
          <p className="eyebrow">Comic / Image Creation</p>
          <h1>Image creation tool</h1>
          <p>输入提示词，选择比例，然后走 Comic tasks 队列生成一张图。</p>
        </div>

        <div className="cards-3">
          <section className="admin-card">
            <p className="eyebrow">Image model</p>
            <h3>{openAiSettings.imageModel}</h3>
            <p>{openAiSettings.imageReady ? "Image API key is configured." : "Set OpenAI image API key first."}</p>
          </section>
          <section className="admin-card">
            <p className="eyebrow">Ratios</p>
            <h3>{COMIC_IMAGE_CREATION_ASPECT_RATIOS.length} options</h3>
            <p>{COMIC_IMAGE_CREATION_ASPECT_RATIOS.join(" / ")}</p>
          </section>
          <section className="admin-card">
            <p className="eyebrow">History</p>
            <h3>{images.length} recent images</h3>
            <p>Generated images are saved with their prompt, model, ratio, and storage metadata.</p>
          </section>
        </div>

        <section className="admin-form">
          <h2>Create image</h2>
          <ComicImageCreationQueueForm
            aspectRatios={COMIC_IMAGE_CREATION_ASPECT_RATIOS}
            qualities={COMIC_IMAGE_CREATION_QUALITIES}
            referenceImages={referenceImages}
          />
        </section>

        <section className="admin-form">
          <div className="admin-review-pagination">
            <div>
              <h2>Recent images</h2>
              <p className="form-note">Newest generated images appear first after the task finishes.</p>
            </div>
          </div>

          {images.length > 0 ? (
            <div className="admin-comic-image-creation-grid">
              {images.map((image) => (
                <article key={image.id} className="admin-comic-image-creation-card">
                  <a
                    href={image.imageUrl}
                    className="admin-comic-image-creation-card__image"
                    style={{ aspectRatio: getComicImageCreationAspectRatioValue(image.aspectRatio) }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      src={image.imageUrl}
                      alt={image.prompt.slice(0, 140)}
                      width={640}
                      height={640}
                      unoptimized
                    />
                  </a>
                  <div className="admin-comic-image-creation-card__body">
                    <div className="stack-row">
                      <span className="pill">{image.aspectRatio}</span>
                      <span className="pill">{getComicImageCreationQualityLabel(image.quality)}</span>
                      <span className="pill">{image.model}</span>
                      {image.sourceType === "TEXT" ? null : <span className="pill">Image to image</span>}
                    </div>
                    <p>{image.prompt}</p>
                    {image.referenceImageUrl ? (
                      <a
                        href={image.referenceImageUrl}
                        className="form-note"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Reference: {image.referenceImageName || "image"}
                      </a>
                    ) : null}
                    <span className="form-note">{formatDate(image.createdAt)}</span>
                    <div className="stack-row">
                      <ComicImageCreationUseReferenceButton
                        image={{
                          id: image.id,
                          imageUrl: image.imageUrl,
                          prompt: image.prompt,
                          aspectRatio: image.aspectRatio,
                          model: image.model,
                          createdAt: image.createdAt.toISOString()
                        }}
                      />
                      <form action={deleteComicImageCreationAction}>
                        <input type="hidden" name="id" value={image.id} />
                        <button type="submit" className="button button--ghost">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="form-note">No generated images yet.</p>
          )}
        </section>
      </div>
    </ComicImageTaskQueueProvider>
  );
}
