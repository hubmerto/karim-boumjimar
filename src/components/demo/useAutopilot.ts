"use client";

import { useEffect, useRef } from "react";

/**
 * Drives a /showcase/* demo route through a scripted async sequence
 * on an infinite loop. Pauses when the tab goes hidden and resumes
 * from the top of the script (cycle 0) when it becomes visible —
 * prevents drift during long recording sessions.
 *
 * The script receives a cancellation-aware `wait()` and a context
 * object describing whether this is the first iteration since the
 * page mounted (or since the tab last became visible). Use
 * `isInitial` for one-time setup that prepares the start state.
 *
 * Cancellation is signalled by `wait()` rejecting with a CancelError;
 * the loop swallows it. Author the script with `await wait(ms)`
 * between every step so a hidden tab pause cuts the script
 * promptly instead of running to the end of the longest beat.
 *
 * The script ref is captured on every render but the effect only
 * runs once per mount, so changing the script in-flight is fine —
 * the next iteration picks up the new version.
 */

class CancelError extends Error {
  constructor() {
    super("autopilot cancelled");
    this.name = "CancelError";
  }
}

export type AutopilotContext = {
  /** Cancellation-aware sleep. Always `await` it. */
  wait: (ms: number) => Promise<void>;
  /** True on the first cycle since mount (or since visibility resume). */
  isInitial: boolean;
  /** Iteration counter starting from 0. */
  cycle: number;
};

export type AutopilotScript = (ctx: AutopilotContext) => Promise<void>;

export function useAutopilot(script: AutopilotScript) {
  // Ref so script changes don't restart the effect — the next loop
  // iteration just reads the latest script.
  const scriptRef = useRef(script);
  scriptRef.current = script;

  useEffect(() => {
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const wait: AutopilotContext["wait"] = (ms) =>
      new Promise<void>((resolve, reject) => {
        if (cancelled) {
          reject(new CancelError());
          return;
        }
        const id = setTimeout(() => {
          timers.delete(id);
          if (cancelled) reject(new CancelError());
          else resolve();
        }, ms);
        timers.add(id);
      });

    function pause() {
      cancelled = true;
      for (const id of timers) clearTimeout(id);
      timers.clear();
    }

    async function run() {
      cancelled = false;
      let cycle = 0;
      while (!cancelled) {
        try {
          await scriptRef.current({
            wait,
            isInitial: cycle === 0,
            cycle,
          });
        } catch (err) {
          if (err instanceof CancelError) return;
          // Surface unexpected errors to the console so a misbehaving
          // demo doesn't fail silently.
          console.error("[autopilot]", err);
          return;
        }
        cycle += 1;
      }
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        pause();
      } else {
        // Resume from cycle 0 — easier to reason about than
        // resuming mid-script and avoids state drift.
        void run();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    void run();

    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
