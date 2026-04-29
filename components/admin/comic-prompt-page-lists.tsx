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
  return `Panel ${panel.panelNumber}: ${panel.panelTitle}`;
}

function getUniqueUploadNames(page: PromptPageView) {
  return Array.from(
    new Set(page.requiredUploads.flatMap((upload) => upload.uploadImageNames).filter(Boolean))
  );
}

function buildUploadChecklist(page: PromptPageView) {
  const uploadNames = getUniqueUploadNames(page);

  if (uploadNames.length === 0) {
    return "No required upload images were listed for this page.";
  }

  return uploadNames.map((name) => `- ${name}`).join("\n");
}

function buildPanelSummary(page: PromptPageView) {
  if (page.panels.length === 0) {
    return "No panel beats were listed for this page.";
  }

  return page.panels
    .map((panel) => `${formatPanelLabel(panel)}\n${panel.storyBeat}`)
    .join("\n\n");
}

function buildPageProductionText(page: PromptPageView) {
  return [
    `${formatPageLabel(page.pageNumber)} production kit`,
    `Page purpose:\n${page.pagePurpose}`,
    `Panel count:\n${page.panelCount}`,
    `Required upload images:\n${buildUploadChecklist(page)}`,
    `Panel beats:\n${buildPanelSummary(page)}`,
    `Prompt to paste into the image tool:\n${page.promptPackCopyText}`,
    page.referenceNotesCopyText
      ? `gpt-image-2 reference notes:\n${page.referenceNotesCopyText}`
      : null
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function getPreviewUrl(relativePath: string) {
  const normalized = relativePath.replaceAll("\\", "/");

  if (normalized.startsWith("public/")) {
    return `/${normalized.replace(/^public\//, "")}`;
  }

  return null;
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
            <h2>Page-by-page production list</h2>
            <p className="form-note">
              Each row is one complete comic page kit. Copy the page kit, upload the listed
              reference images, then paste the prompt into the image-generation tool.
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
              rows={getTextareaRows(globalGptImage2Notes, 7, 16)}
              value={globalGptImage2Notes}
              readOnly
            />
          </div>
        ) : null}

        <div className="admin-comic-page-list">
          {promptPages.map((page) => {
            const uploadNames = getUniqueUploadNames(page);
            const pageProductionText = buildPageProductionText(page);

            return (
              <article key={`page-kit-${page.pageNumber}`} className="admin-comic-page-list-item">
                <div className="admin-comic-page-list-item__header">
                  <div>
                    <p className="eyebrow">{formatPageLabel(page.pageNumber)}</p>
                    <h3>{page.pagePurpose}</h3>
                    <div className="stack-row">
                      <span className="pill">{page.panelCount} panels</span>
                      <span className="pill">{uploadNames.length} upload images</span>
                    </div>
                  </div>
                  <div className="admin-comic-page-list-item__actions">
                    <CopyTextButton
                      text={pageProductionText}
                      label="Copy full page kit"
                      copiedLabel="Page kit copied"
                    />
                    <CopyTextButton
                      text={page.promptPackCopyText}
                      label="Copy prompt only"
                      copiedLabel="Prompt copied"
                    />
                  </div>
                </div>

                <div className="admin-comic-page-section">
                  <div>
                    <h4>Upload these references first</h4>
                    <p className="form-note">
                      File names are listed first for quick selection. Open a row to see why the
                      image is needed and where it lives in the workspace.
                    </p>
                  </div>
                  {uploadNames.length > 0 ? (
                    <div className="admin-comic-upload-name-list">
                      {uploadNames.map((fileName) => (
                        <span key={`${page.pageNumber}-${fileName}`} className="pill">
                          {fileName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="form-note">No upload images were listed for this page.</p>
                  )}
                  {page.requiredUploads.length > 0 ? (
                    <div className="admin-comic-upload-list">
                      {page.requiredUploads.map((upload, uploadIndex) => (
                        <details
                          key={`${page.pageNumber}-${upload.bucket}-${upload.slug}-${uploadIndex}`}
                          className="admin-comic-upload-item"
                        >
                          <summary className="admin-comic-upload-summary">
                            <span>{upload.uploadImageNames.join(", ") || upload.label}</span>
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
                                  <li key={`${page.pageNumber}-${upload.slug}-${fileName}`}>
                                    {fileName}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <strong>Workspace paths</strong>
                              <ul className="admin-comic-upload-bullets">
                                {upload.relativePaths.map((relativePath) => {
                                  const previewUrl = getPreviewUrl(relativePath);

                                  return (
                                    <li key={`${page.pageNumber}-${upload.slug}-${relativePath}`}>
                                      <code>{relativePath}</code>
                                      {previewUrl ? (
                                        <a
                                          href={previewUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="link-inline"
                                        >
                                          Preview
                                        </a>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="admin-comic-page-section">
                  <div className="admin-comic-section-heading">
                    <div>
                      <h4>Panel plan</h4>
                      <p className="form-note">Use this to check the page rhythm before generating.</p>
                    </div>
                    <span className="pill">{page.panels.length} listed</span>
                  </div>
                  <ol className="admin-comic-panel-list">
                    {page.panels.map((panel) => (
                      <li
                        key={`${page.pageNumber}-${panel.panelNumber}`}
                        className="admin-comic-prompt-panel-item"
                      >
                        <strong>{formatPanelLabel(panel)}</strong>
                        <span className="form-note">{panel.storyBeat}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="admin-comic-copy-grid">
                  <div className="field">
                    <label>{formatPageLabel(page.pageNumber)} image prompt</label>
                    <textarea
                      rows={getTextareaRows(page.promptPackCopyText, 12, 24)}
                      value={page.promptPackCopyText}
                      readOnly
                    />
                  </div>

                  <div className="field">
                    <label>{formatPageLabel(page.pageNumber)} gpt-image-2 reference notes</label>
                    <textarea
                      rows={getTextareaRows(page.referenceNotesCopyText || "No extra reference notes.", 12, 24)}
                      value={page.referenceNotesCopyText || "No extra reference notes."}
                      readOnly
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
