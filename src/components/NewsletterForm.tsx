"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CONTACT } from "@/data/bio";

/** ────────────────────────────────────────────────────────────────────
 *  Submit stub — REPLACE WITH REAL BACKEND CALL.
 *
 *  When a newsletter backend exists (Buttondown, Resend audiences,
 *  Mailchimp, a Vercel API route, etc.) replace the body of this
 *  function with the actual subscribe call. Return on success, throw
 *  on failure with a user-facing message. The form below already
 *  handles the loading / success / error states; no UI changes
 *  needed when wiring the backend.
 *
 *  For now: throws a polite "not configured" error that the form
 *  catches and surfaces, directing visitors to email Karim directly.
 *  We don't pretend to capture emails — capturing them to a dead
 *  endpoint is worse than not having a form at all.
 *  ─────────────────────────────────────────────────────────────────── */
async function submitNewsletter(email: string): Promise<void> {
  // Strictly a placeholder. Once a backend is live this becomes:
  //
  //   const res = await fetch("/api/newsletter", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ email }),
  //   });
  //   if (!res.ok) throw new Error(await res.text());
  //
  // Until then, refer the visitor to a real channel.
  void email;
  // Short pause so the UI's "submitting" state actually flashes — not
  // strictly necessary but it makes the button-disabled state visible
  // long enough that the user notices their click registered before
  // the message appears.
  await new Promise((r) => setTimeout(r, 350));
  throw new Error("not-configured");
}

type State = "idle" | "submitting" | "success" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setState("submitting");
    try {
      await submitNewsletter(trimmed);
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <p className="mt-6 text-body leading-[1.65] text-ink">
        Thanks — you’re on the list. A confirmation should arrive in your inbox
        shortly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-[420px]" noValidate>
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex items-center gap-3 border-b border-line pb-2 focus-within:border-ink">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === "submitting"}
          className="flex-1 bg-transparent text-body text-ink placeholder:text-mute focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={state === "submitting" || !email.trim()}
          className="italic text-meta uppercase tracking-[0.1em] text-mute hover:text-ink disabled:opacity-50 disabled:hover:text-mute"
        >
          {state === "submitting" ? "…" : "Subscribe"}
        </button>
      </div>
      {state === "error" ? (
        // Today this error fires every time because the submit stub
        // throws unconditionally. Once a real backend is wired, the
        // copy below stops being correct — narrow it to a generic
        // "couldn't subscribe, try again" line or surface the
        // backend's own error string via the catch above.
        <p className="mt-3 text-xs leading-[1.6] text-mute">
          Sign-up isn’t live yet. Email{" "}
          <a
            href={`mailto:${CONTACT.email}`}
            className="underline underline-offset-2 hover:text-ink"
          >
            {CONTACT.email}
          </a>{" "}
          to be added when it launches.
        </p>
      ) : (
        <p className="mt-3 text-xs leading-[1.6] text-mute">
          Your address is used only for this newsletter. See{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-ink"
          >
            Privacy
          </Link>{" "}
          for details.
        </p>
      )}
    </form>
  );
}
