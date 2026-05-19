"use client";

import Image from "next/image";
import { useState } from "react";

type FinancePaymentProofViewerProps = {
  attachmentUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
};

export function FinancePaymentProofViewer({
  attachmentUrl,
  fileName,
  mimeType
}: FinancePaymentProofViewerProps) {
  const [open, setOpen] = useState(false);

  if (!attachmentUrl) {
    return <span className="admin-table__empty">-</span>;
  }

  const isImage = Boolean(mimeType?.startsWith("image/"));
  const isPdf = mimeType === "application/pdf";

  return (
    <>
      <button type="button" className="button button--secondary button--compact" onClick={() => setOpen(true)}>
        查看付款信息
      </button>
      {open ? (
        <div className="finance-proof-modal" role="dialog" aria-modal="true" aria-label="付款信息">
          <button
            type="button"
            className="finance-proof-modal__backdrop"
            aria-label="关闭付款信息"
            onClick={() => setOpen(false)}
          />
          <div className="finance-proof-modal__panel">
            <div className="finance-proof-modal__header">
              <strong>付款信息</strong>
              <button type="button" className="finance-proof-modal__close" onClick={() => setOpen(false)} aria-label="关闭">
                ×
              </button>
            </div>
            <div className="finance-proof-modal__body">
              {isImage ? (
                <Image
                  src={attachmentUrl}
                  alt={fileName || "付款截图"}
                  width={960}
                  height={720}
                  unoptimized
                />
              ) : isPdf ? (
                <iframe src={attachmentUrl} title={fileName || "付款信息"} />
              ) : (
                <a href={attachmentUrl} target="_blank" rel="noreferrer" className="button button--secondary">
                  打开附件
                </a>
              )}
            </div>
            {fileName ? <p className="form-note">{fileName}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
