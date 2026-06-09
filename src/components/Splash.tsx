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
//  - MIN_HOLD_MS: floor so the logo + line register even on a warm cache.
//  - MAX_WAIT_MS: hard cap so a slow / broken asset can never trap the
//    visitor behind the splash forever.
//  - sessionStorage: once seen in a tab, skip entirely (same-tab reloads,
//    bfcache, mobile address-bar gestures shouldn't replay it).
const FADE_MS = 1000;
const MIN_HOLD_MS = 900;
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
    const start = performance.now();

    const finish = () => {
      if (cancelled) return;
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

    // Preload + decode the overview thumbnails, tracking real progress.
    const urls = overviewThumbUrls();
    const total = Math.max(1, urls.length);
    let done = 0;
    const bump = () => {
      if (cancelled) return;
      done += 1;
      setProgress(done / total);
      if (done >= total) {
        // Everything's decoded — reveal, but never before MIN_HOLD so the
        // logo + line don't flash by on a fast/warm connection.
        const wait = Math.max(0, MIN_HOLD_MS - (performance.now() - start));
        window.setTimeout(finish, wait);
      }
    };
    for (const url of urls) {
      const img = new Image();
      img.src = url;
      // decode() resolves once the image is downloaded AND decoded (ready
      // to paint with no jank), which is exactly the readiness the reveal
      // needs. Fall back to load/error events where unsupported. Errors
      // count as done so one missing asset can't stall the gate.
      if (typeof img.decode === "function") {
        img.decode().then(bump, bump);
      } else {
        img.onload = bump;
        img.onerror = bump;
      }
    }

    // Hard cap: reveal regardless after MAX_WAIT_MS.
    const cap = window.setTimeout(finish, MAX_WAIT_MS);

    return () => {
      cancelled = true;
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
