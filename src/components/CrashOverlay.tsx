"use client";

import { useEffect, useState } from "react";

/**
 * Mobile-friendly diagnostic overlay. iOS Safari has no console accessible
 * to a phone user, and crash patterns like"Cannot open this page" leave
 * no trace. This component:
 *  - catches window.error and unhandledrejection
 *  - persists the last error in sessionStorage so it survives the WebKit
 *    process restart
 *  - shows the error inline at the top of the page on the next load
 *
 * Tap-to-dismiss. The overlay is intentionally ugly so it can't be missed.
 */
const STORAGE_KEY = "kbz_last_error";

type StoredError = {
  message: string;
  stack?: string;
  href?: string;
  ua?: string;
  ts?: number;
};

export function CrashOverlay() {
  const [stored, setStored] = useState<StoredError | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Show whatever the last load logged.
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setStored(JSON.parse(raw) as StoredError);
    } catch {
      // sessionStorage unavailable (private mode etc); fall through.
    }

    function persist(message: string, stack?: string) {
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            message,
            stack,
            href: window.location.href,
            ua: navigator.userAgent,
            ts: Date.now(),
          }),
        );
      } catch {}
    }

    function onError(e: ErrorEvent) {
      persist(e.message ?? String(e), e.error?.stack);
    }
    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason;
      const msg =
        reason instanceof Error
          ? reason.message
          : String(reason ?? "unhandled rejection");
      const stack = reason instanceof Error ? reason.stack : undefined;
      persist(`Unhandled rejection: ${msg}`, stack);
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!stored) return null;

  function dismiss() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setStored(null);
  }

  const age = stored.ts ? Math.round((Date.now() - stored.ts) / 1000) : null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#ffd23f",
        color: "#111",
        padding: "12px 14px",
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.45,
        maxHeight: "55vh",
        overflow: "auto",
        boxShadow: "0 6px 20px -8px rgba(0,0,0,.25)",
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        Last load crashed{age !== null ? ` (${age}s ago)` : ""}. Tap to dismiss.
      </div>
      <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {stored.message}
      </div>
      {stored.stack ? (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            marginTop: 8,
            fontSize: 11,
          }}
        >
          {stored.stack}
        </pre>
      ) : null}
      {stored.ua ? (
        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 10 }}>
          {stored.ua}
        </div>
      ) : null}
    </div>
  );
}
