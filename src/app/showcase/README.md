# Showcase routes

Hidden, `noindex`'d demo surfaces designed to be screen-recorded
individually for portfolio reels, case-study videos, and social
posts. Every route runs an `useAutopilot()` script on a continuous
loop, hides the cursor / scrollbars / chrome via `<DemoFrame />`,
and pauses when the tab is not visible (resumes from the start of
the script when it becomes visible — prevents drift during long
recording sessions).

The autopilot is a thin scripted layer that dispatches the same
store actions a user would. No DOM clicks on canvas pixels, no
duplicated layout math.

## Routes

| Route | What it shows | Loop | Recommended viewport |
|---|---|---|---|
| `/showcase` | Original gallery loop on Bodies Under Construction (predates the autopilot system) | ~24 s | 1280 × 800 |
| `/showcase/navigation` | Index drawer cycling through three projects | ~22 s | 1280 × 800 |
| `/showcase/mobile` | Mobile gallery + sheet loop on Symbiosis (MFA) | ~30 s | 390 × 844 |
| `/showcase/tornado` | Photos swirl around their bento slot | ~5 s | 1280 × 800 |
| `/showcase/tornado/gif` | Auto-downloads transparent GIF of the swirl | n/a | n/a |
| **New autopilot routes:** | | | |
| `/showcase/bento-entry` | Diamond appearing animation, on loop | ~7 s | 1280 × 800 |
| `/showcase/dispersion` | bento → cluster → bento | ~17 s | 1280 × 800 |
| `/showcase/flip` | Gallery FLIP open + close on a single image | ~9 s | 1280 × 800 |
| `/showcase/cluster-variation` | Sweep through 5 different cluster grids | ~35 s | 1280 × 800 |
| `/showcase/inertia` | Pan flicks → inertial glides | ~12 s | 1280 × 800 |
| `/showcase/reset-cascade` | Logo-reset from gallery → bento (full chain) | ~14 s | 1280 × 800 |
| `/showcase/dual-renderer` | DOM canvas + WebGL canvas side-by-side, syncing | ~17 s | 1800 × 900 |
| `/showcase/mobile-sheet` | InspectorSheet swipe up + down | ~5 s | 390 × 844 |
| `/showcase/wordmark` | Logo wordmark fade-in + dissolve | ~4 s | 1080 × 720 |

## Recording workflow

1. Open the URL in a fresh browser window sized to the recommended
   viewport. For mobile routes, use Chrome DevTools mobile
   emulation OR open Chrome at a phone-width window:

   ```bash
   osascript -e '
   tell application "Google Chrome"
     activate
     set newWindow to (make new window)
     set bounds of newWindow to {120, 80, 510, 924}
     set URL of active tab of newWindow to "http://localhost:3000/showcase/<route>"
   end tell'
   ```

2. Wait for the first cycle to complete — it usually includes
   one-time setup (intro reveal, navigation to a starting cluster,
   etc.). Subsequent cycles are the recording target.

3. Hit record (QuickTime, OBS, ScreenStudio, Kap — your preference).

4. Capture from one loop seam to the next loop seam. The seam is
   usually obvious (white frame, settled bento, settled cluster).

5. Stop recording. The clip will loop seamlessly as a video file
   because the start frame matches the end frame.

## Autopilot internals

```tsx
import { useAutopilot } from "@/components/demo/useAutopilot";
import { DemoFrame } from "@/components/demo/DemoFrame";

useAutopilot(async ({ wait, isInitial, cycle }) => {
  if (isInitial) {
    // one-time setup
  }
  // loop body — runs every cycle, including the first
  someStoreAction();
  await wait(2000);
});
```

`wait()` rejects with a `CancelError` when the tab goes hidden;
the hook swallows it and re-runs the script on visibility resume.

The store exposes the actions every demo needs:

- `setSplashGone(boolean)` — gate the canvas's intro reveal effect
- `selectGroup(key)` — select a project, fly camera to its cluster
- `selectWork(id, groupKey)` — select a specific image inside a group
- `expandGroup(key)` / `collapseGroup()` — open / close gallery
- `navigateToGroup(key)` — same as selectGroup but more deliberate
- `resetToOverview()` — logo-click equivalent; cascade back to bento
- `setInspectorSheetSnap("peek" | "mid" | "full" | null)` — drive the
  mobile sheet (`null` releases the override)
- `replayIntro()` — bump a token; canvas re-runs the 75 % → 100 %
  intro reveal animation (used by `/showcase/bento-entry`)
- `flickPan(vx, vy)` — bump a token + velocity; canvas seeds its
  kinetic inertia loop with the supplied velocity in screen px / ms
  (used by `/showcase/inertia`)

## Window flags (set synchronously at module-load, before mount)

- `__FAST_INTRO__` — halve the canvas intro reveal duration
  (3.5 s vs production 6 s)
- `__FORCE_MOBILE__` — make `<ViewSwitcher>` unconditionally
  render the mobile branch (Pixi + InspectorSheet) regardless of
  viewport size

## Status

Every autopilot route in the table above ships in this commit set.
Unknowns reported back to spec:

- Inertia injection: existing useCanvas had no public entry point.
  Added `flickPan(vx, vy)` to the store + a token watcher in
  useCanvas that seeds `velocityRef` and starts the same kinetic
  inertia rAF loop a real wheel/drag release fires.
- Intro replay: existing intro reveal effect only fired on first
  splashGone change. Added `replayIntro()` action + a token watcher
  in useCanvas that resets `userInteractedRef`, snaps the camera
  to 75 %-bento, and tweens to 100 % bento. The mobile renderer
  (`CanvasPixi`) does NOT yet honour `replayIntro` — the bento-entry
  route uses a `key` prop on `<ViewSwitcher />` to remount the
  whole canvas tree instead, which works on both renderers
  (cheap because tile thumbnails are cached after the first load).
- Dual-renderer sync: iframes drift by a few dozen ms over a cycle
  because each runs its own autopilot. Acceptable for the
  comparison recording use case. If exact phase-lock is needed,
  plumb a BroadcastChannel between parent and iframes.
- Wordmark: production has no animated wordmark beyond the
  splash's hold-and-dissolve. The route reproduces that treatment
  on a transparent canvas. If you want a different intro effect
  (stroke-in, mask reveal), the keyframes live entirely in the
  route file.

Routes that worked cleanly with existing primitives:
`/dispersion`, `/flip`, `/cluster-variation`, `/reset-cascade`,
`/mobile-sheet`, `/wordmark`, `/dual-renderer`.

Routes that needed store extensions: `/inertia` (flickPan),
`/bento-entry` (key remount).

Routes that may need a second pass:
- `/bento-entry` — verify the canvas remount doesn't flash the
  un-decoded thumbnails on subsequent cycles. If it does, the
  PreloadGalleryImages pattern can be adapted to keep the
  thumbnail cache hot during the white wipe.
- `/inertia` — the flick velocities (1.6, 1.4, 1.2 px/ms) were
  picked by feel; tune up or down based on what the camera
  actually needs to glide.
- `/dual-renderer` — if the iframes drift visibly during a record,
  add BroadcastChannel sync.
