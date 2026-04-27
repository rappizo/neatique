import { CopyTextButton } from "@/components/admin/copy-text-button";

type PromptPanelView = {
  panelNumber: number;
  panelTitle: string;
  storyBeat: string;
};

type PromptUploadView = {
  bucket: "CHARACTER" | "SCENE" | "CHAPTER_SCENE";
  label: string;
  slug: string;
  whyThisMatters: string;
  contentSummary: string;
  uploadImageNames: string[];
  relativePaths: string[];
};

type PromptPageView = {
  pageNumber: number;
  panelCount: number;
  pagePurpose: string;
  promptPackCopyText: string;
  referenceNotesCopyText: string;
  panels: PromptPanelView[];
  requiredUploads: PromptUploadView[];
};

type ComicPromptPageListsProps = {
  episodeLogline: string | null;
  episodeSynopsis: string | null;
  promptPages: PromptPageView[];
  globalGptImage2Notes: string | null;
};

function getTextareaRows(value: string, minRows: number, maxRows: number) {
  const rows = value.split(/\r?\n/).length + 1;
  return Math.max(minRows, Math.min(maxRows, rows));
}

function formatPageLabel(pageNumber: number) {
  return `Page ${String(pageNumber).padStart(2, "0")}`;
}

function formatPanelLabel(panel: PromptPanelView) {
  return `P${panel.panelNumber}. ${panel.panelTitle}`;
}

export function ComicPromptPageLists({
  episodeLogline,
  episodeSynopsis,
  promptPages,
  globalGptImage2Notes
}: ComicPromptPageListsProps) {
  return (
    <div className="admin-comic-prompt-lists">
      {episodeLogline || episodeSynopsis ? (
        <div className="cards-2">
          {episodeLogline ? (
            <section className="admin-card">
              <p className="eyebrow">Episode logline</p>
              <p>{episodeLogline}</p>
            </section>
          ) : null}
          {episodeSynopsis ? (
            <section className="admin-card">
              <p className="eyebrow">Episode synopsis</p>
              <p>{episodeSynopsis}</p>
            </section>
          ) : null}
        </div>
      ) : null}

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Prompt pack by page</h2>
            <p className="form-note">
              Each block is written so we can paste it directly into the image-generation tool for
              one comic page.
            </p>
          </div>
        </div>
        <div className="admin-comic-prompt-page-grid">
          {promptPages.map((page) => (
            <article key={`prompt-${page.pageNumber}`} className="admin-comic-prompt-page">
              <div className="admin-review-pagination">
                <div>
                  <h3>{formatPageLabel(page.pageNumber)}</h3>
                  <p className="form-note">{page.pagePurpose}</p>
                </div>
                <div className="stack-row">
                  <span className="pill">{page.panelCount} panels</span>
                  <CopyTextButton
                    text={page.promptPackCopyText}
                    label="Copy page prompt"
                    copiedLabel="Prompt copied"
                  />
                </div>
              </div>

              <div className="admin-comic-prompt-panel-list">
                {page.panels.map((panel) => (
                  <div
                    key={`${page.pageNumber}-${panel.panelNumber}`}
                    className="admin-comic-prompt-panel-item"
                  >
                    <strong>{formatPanelLabel(panel)}</strong>
                    <span className="form-note">{panel.storyBeat}</span>
                  </div>
                ))}
              </div>

              <div className="field">
                <label>{formatPageLabel(page.pageNumber)} prompt block</label>
                <textarea
                  rows={getTextareaRows(page.promptPackCopyText, 12, 26)}
                  value={page.promptPackCopyText}
                  readOnly
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-form">
        <div className="admin-review-pagination">
          <div>
            <h2>Required references and gpt-image-2 notes by page</h2>
            <p className="form-note">
              Upload image names are shown first. Open any row to see what the file locks, why it
              matters, and which workspace path it came from.
            </p>
          </div>
          {globalGptImage2Notes ? (
            <CopyTextButton
              text={globalGptImage2Notes}
              label="Copy global notes"
              copiedLabel="Global notes copied"
            />
          ) : null}
        </div>

        {globalGptImage2Notes ? (
          <div className="field">
            <label>Global gpt-image-2 notes</label>
            <textarea
              rows={getTextareaRows(globalGptImage2Notes, 8, 20)}
              value={globalGptImage2Notes}
              readOnly
            />
          </div>
        ) : null}

        <div className="admin-comic-prompt-page-grid">
          {promptPages.map((page) => (
            <article key={`refs-${page.pageNumber}`} className="admin-comic-prompt-page">
              <div className="admin-review-pagination">
                <div>
                  <h3>{formatPageLabel(page.pageNumber)}</h3>
                  <p className="form-note">
                    {page.panelCount} panels. Upload these refs before generating this page.
                  </p>
                </div>
                <CopyTextButton
                  text={page.referenceNotesCopyText}
                  label="Copy ref notes"
                  copiedLabel="Ref notes copied"
                />
              </div>

              <div className="field">
                <label>{formatPageLabel(page.pageNumber)} reference block</label>
                <textarea
                  rows={getTextareaRows(page.referenceNotesCopyText, 10, 22)}
                  value={page.referenceNotesCopyText}
                  readOnly
                />
              </div>

              <div className="admin-comic-upload-list">
                {page.requiredUploads.map((upload) => (
                  <details
                    key={`${page.pageNumber}-${upload.bucket}-${upload.slug}-${upload.uploadImageNames.join("-")}`}
                    className="admin-comic-upload-item"
                  >
                    <summary className="admin-comic-upload-summary">
                      <span>{upload.uploadImageNames.join(", ")}</span>
                      <span className="pill">{upload.bucket}</span>
                    </summary>
                    <div className="admin-comic-upload-details">
                      <p>
                        <strong>Reference source:</strong> {upload.label}
                      </p>
                      <p>
                        <strong>Why upload it:</strong> {upload.whyThisMatters}
                      </p>
                      <p>
                        <strong>What this image locks:</strong> {upload.contentSummary}
                      </p>
                      <div>
                        <strong>Upload file names</strong>
                        <ul className="admin-comic-upload-bullets">
                          {upload.uploadImageNames.map((fileName) => (
                            <li key={`${upload.slug}-${fileName}`}>{fileName}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Workspace paths</strong>
                        <ul className="admin-comic-upload-bullets">
                          {upload.relativePaths.map((relativePath) => (
                            <li key={`${upload.slug}-${relativePath}`}>
                              <code>{relativePath}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
