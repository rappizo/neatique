"use client";

import { useState } from "react";

type TikTokFollowUploadFormProps = {
  customerName?: string;
  customerEmail?: string;
};

export function TikTokFollowUploadForm({
  customerName = "",
  customerEmail = ""
}: TikTokFollowUploadFormProps) {
  const [selectedFileName, setSelectedFileName] = useState("");

  return (
    <form
      id="tiktok-follow"
      action="/api/mascot/follow"
      method="post"
      encType="multipart/form-data"
      className="contact-form mascot-follow-form"
    >
      <div className="mascot-follow-form__grid">
        <div className="field">
          <label htmlFor="follow-name">Name</label>
          <input
            id="follow-name"
            name="name"
            defaultValue={customerName}
            placeholder="Your name"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="follow-email">Email for your reward receipt</label>
          <input
            id="follow-email"
            name="email"
            type="email"
            defaultValue={customerEmail}
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="follow-tiktok">TikTok username <span className="form-note">(optional)</span></label>
        <input id="follow-tiktok" name="tiktokUsername" placeholder="@yourhandle" />
      </div>

      <div className="field">
        <label htmlFor="follow-screenshot">
          Upload your TikTok follow screenshot <span className="field__required">(Required)</span>
        </label>
        <input
          id="follow-screenshot"
          name="screenshot"
          type="file"
          accept="image/*"
          required
          className="omb-file-input"
          onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name || "")}
        />
        <label htmlFor="follow-screenshot" className="omb-file-trigger">
          <span className="button button--secondary">Choose Screenshot</span>
          <span className="omb-file-trigger__name">
            {selectedFileName || "No screenshot selected"}
          </span>
        </label>
      </div>

      <button type="submit" className="button button--primary mascot-follow-form__submit">
        Upload screenshot + get 500 points
      </button>
    </form>
  );
}
