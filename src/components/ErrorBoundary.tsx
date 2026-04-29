"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

const STORAGE_KEY = "kbz_last_error";

/**
 * Top-level React error boundary. Forwards the caught error to the same
 * sessionStorage slot CrashOverlay reads from, so component crashes show
 * in the overlay on the next load.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          message: `[React] ${error.message}`,
          stack: error.stack,
          href: window.location.href,
          ua: navigator.userAgent,
          ts: Date.now(),
        }),
      );
    } catch {}
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#fffdf5",
            color: "#111",
            padding: 20,
            fontFamily: "ui-monospace, Menlo, monospace",
            fontSize: 13,
            overflow: "auto",
            zIndex: 9998,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Something broke. Reload to see the error overlay at the top.
          </div>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
