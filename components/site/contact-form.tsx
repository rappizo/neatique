"use client";

import { useEffect, useState } from "react";

export function ContactForm() {
  const [startedAt, setStartedAt] = useState("");

  useEffect(() => {
    setStartedAt(Date.now().toString());
  }, []);

  return (
    <form action="/api/contact" method="post" className="contact-form">
      <input type="hidden" name="startedAt" value={startedAt} />
      <div className="contact-form__honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" required minLength={2} maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required maxLength={160} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input id="subject" name="subject" required minLength={3} maxLength={140} />
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" required minLength={10} maxLength={2500} />
      </div>
      <button type="submit" className="button button--primary">
        Send message
      </button>
    </form>
  );
}
