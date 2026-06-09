"use client";

import { useEffect, useState } from "react";
import { ARTIST_NAME } from "@/data/bio";
import { WORKS } from "@/data/works";
import { asset } from "@/lib/paths";
import { useSelection } from "@/lib/store";
import { thumbSrc } from "@/lib/thumbs";

// The splash is a REAL loading gate, not a fixed timer. It holds the
// reveal until the bento overview's thumbnails are actually decoded, so
// a first visitor sees the staggered tile fade-in + camera zoom play in
// order instead of tiles popping in as their images arrive over the
// wire. A thin progress line under the wordmark shows real load progress.
//
// Guard rails:
//  - MIN_VISIBLE_MS: the loading animation always plays at least this
//    long, so a first-time visitor sees the logo + line fill even when
//    the assets are already cached (instant decode) — never a flash.
//  - MAX_WAIT_MS: hard cap so a slow / broken asset can never trap the
//    visitor behind the splash forever.
//  - sessionStorage: once seen in a tab, skip entirely (same-tab reloads,
//    bfcache, mobile address-bar gestures shouldn't replay it).
const FADE_MS = 1000;
const MIN_VISIBLE_MS = 2000;
const MAX_WAIT_MS = 20000;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const SESSION_KEY = "kbz_splash_seen";

/**
 * Thumbnail URLs the bento OVERVIEW reveals on first paint — the set
 * worth waiting for. Both renderers draw these exact URLs (desktop
 * WorkTile <img>, mobile Pixi Assets.load), so preloading them warms the
 * cache for whichever mounts. Desktop shows every tile; mobile shows a
 * few representative tiles per project, so we only gate on those (keeps
 * the mobile wait + data sane — the rest stream in behind the reveal).
 */
function overviewThumbUrls(): string[] {
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches;
  if (!isMobile) return WORKS.map((w) => asset(thumbSrc(w.images[0].src)));

  const byGroup = new Map<string, typeof WORKS>();
  for (const w of WORKS) {
    const key = `${w.title}|${w.year}`;
    const arr = byGroup.get(key);
    if (arr) arr.push(w);
    else byGroup.set(key, [w]);
  }
  const urls: string[] = [];
  for (const arr of byGroup.values()) {
    const picks =
      arr.length <= 3
        ? arr
        : [arr[0], arr[Math.floor(arr.length / 2)], arr[arr.length - 1]];
    for (const w of picks) urls.push(asset(thumbSrc(w.images[0].src)));
  }
  return urls;
}

export function Splash({ forcePlay = false }: { forcePlay?: boolean } = {}) {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const [progress, setProgress] = useState(0);
  const setSplashGone = useSelection((s) => s.setSplashGone);

  useEffect(() => {
    // Same-tab reloads / non-forced showcase: skip the gate entirely.
    if (
      !forcePlay &&
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(SESSION_KEY)
    ) {
      setPhase("gone");
      setSplashGone(true);
      return;
    }

    let cancelled = false;
    let finished = false;
    let raf = 0;
    const start = performance.now();

    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      setProgress(1);
      setPhase("out");
      window.setTimeout(() => {
        if (cancelled) return;
        setPhase("gone");
        setSplashGone(true);
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          // Private mode / quota — next reload just replays the gate.
        }
      }, FADE_MS);
    };

    // Preload + decode the overview thumbnails. decode() resolves once an
    // image is downloaded AND decoded (ready to paint with no jank).
    // Errors count as done so one missing asset can't stall the gate.
    const urls = overviewThumbUrls();
    const total = Math.max(1, urls.length);
    let decoded = 0;
    const bump = () => {
      decoded += 1;
    };
    for (const url of urls) {
      const img = new Image();
      img.src = url;
      if (typeof img.decode === "function") {
        img.decode().then(bump, bump);
      } else {
        img.onload = bump;
        img.onerror = bump;
      }
    }

    // Drive the line each frame. It fills by the SLOWER of two things:
    // real decode progress, and a steady MIN_VISIBLE_MS clock. So on a
    // warm cache (instant decode) the line still fills smoothly over ~2s
    // instead of snapping full and flashing away — the loading animation
    // always plays on a first visit. On a cold load it tracks the real
    // download. Reveal only once BOTH are complete (or the hard cap hits).
    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      const real = decoded / total;
      const timeFrac = Math.min(1, elapsed / MIN_VISIBLE_MS);
      setProgress(Math.min(real, timeFrac));
      if ((real >= 1 && elapsed >= MIN_VISIBLE_MS) || elapsed >= MAX_WAIT_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Background-safe backstop: rAF pauses in a hidden tab, so guarantee
    // the gate still resolves via a timer.
    const cap = window.setTimeout(finish, MAX_WAIT_MS + 500);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(cap);
    };
  }, [setSplashGone, forcePlay]);

  if (phase === "gone") return null;

  const out = phase === "out";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas"
      style={{
        opacity: out ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ${EASE}`,
        pointerEvents: out ? "none" : "auto",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset("/logo.svg")}
        alt={ARTIST_NAME}
        draggable={false}
        className="block h-10 w-auto max-w-[70vw] select-none md:h-14"
        style={{
          // Subtle dissolve forward as the splash fades.
          transform: out ? "scale(1.04)" : "scale(1)",
          transition: `transform ${FADE_MS}ms ${EASE}`,
          willChange: "transform",
        }}
      />
      {/* Thin, sleek loading line under the wordmark. Track = --color-line,
          fill = --color-ink, scaled left→right by real decode progress.
          On fade-out it completes to full so it never leaves mid-way. */}
      <div
        className="mt-5 h-px w-32 overflow-hidden bg-line md:mt-6 md:w-40"
        style={{
          opacity: out ? 0 : 1,
          transition: `opacity 400ms ${EASE}`,
        }}
      >
        <div
          className="h-full w-full bg-ink"
          style={{
            transformOrigin: "left center",
            transform: `scaleX(${out ? 1 : Math.max(0.02, progress)})`,
            transition: `transform 240ms ${EASE}`,
          }}
        />
      </div>
    </div>
  );
}
