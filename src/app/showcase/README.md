# Showcase routes

Hidden, `noindex`'d demo surfaces designed to be screen-recorded
individually for portfolio reels, case-study videos, and social
posts. Every route runs a `useAutopilot()` script on a continuous
loop, hides the cursor / scrollbars / chrome via `<DemoFrame />`,
and pauses when the tab is not visible (resumes from the start of
the script when it becomes visible — prevents drift during long
recording sessions).

The autopilot is a thin scripted layer that dispatches the same
store actions a user would. No DOM clicks on canvas pixels, no
duplicated layout math.

## Single-gesture routes (round-trip clean)

These are the focused single-gesture demos. Each gesture's loop is
the gesture's own symmetry — first and last frame visually
identical, no fade transitions, no resets, no jump cuts.

| Route | What it shows | Loop | Recording viewport |
|---|---|---|---|
| `/showcase/sheet` | Sheet drag up, content scroll down, scroll up, drag down | ~12 s | 390 × 844 |
| `/showcase/sheet-snap` | Partial drag → release → snap-to-nearest (both directions) | ~8 s | 390 × 844 |
| `/showcase/zoom-mobile` | Programmatic pinch outward → spread → pinch inward → bento | ~8 s | 390 × 844 |
| `/showcase/cluster` | Tap cluster → FLIP into gallery → tap close → FLIP back | ~10 s | 390 × 844 |
| `/showcase/strip-mobile` | Tap image in cluster grid → FLIP into strip → close → FLIP back | ~9 s | 390 × 844 |
| `/showcase/zoom-desktop` | Same pinch as zoom-mobile, desktop renderer | ~8 s | 1280 × 800 |
| `/showcase/select` | Click cluster → panel slides in → close → slides out | ~6 s | 1280 × 800 |
| `/showcase/strip-desktop` | Same as strip-mobile, desktop renderer | ~7 s | 1280 × 800 |
| `/showcase/pan` | Flick right → glide → flick left → glide → recall to centre | ~7 s | 1280 × 800 |

## Multi-gesture / longer-form routes

Earlier showcase set; longer cycles, more state changes per loop.

| Route | What it shows | Loop | Recording viewport |
|---|---|---|---|
| `/showcase` | Original gallery loop on Bodies Under Construction | ~24 s | 1280 × 800 |
| `/showcase/navigation` | Index drawer cycling through three projects | ~22 s | 1280 × 800 |
| `/showcase/mobile` | Mobile gallery + sheet loop on Symbiosis (MFA) | ~30 s | 390 × 844 |
| `/showcase/tornado` | Photos swirl around their bento slot | ~5 s | 1280 × 800 |
| `/showcase/tornado/gif` | Auto-downloads transparent GIF of the swirl | n/a | n/a |
| `/showcase/bento-entry` | Diamond appearing animation, on loop | ~7 s | 1280 × 800 |
| `/showcase/dispersion` | bento → cluster → bento | ~17 s | 1280 × 800 |
| `/showcase/flip` | Gallery FLIP open + close on a single image | ~9 s | 1280 × 800 |
| `/showcase/cluster-variation` | Sweep through 5 different cluster grids | ~35 s | 1280 × 800 |
| `/showcase/inertia` | Pan flicks → inertial glides | ~12 s | 1280 × 800 |
| `/showcase/reset-cascade` | Logo-reset from gallery → bento (full chain) | ~14 s | 1280 × 800 |
| `/showcase/dual-renderer` | DOM canvas + WebGL canvas side-by-side | ~17 s | 1800 × 900 |
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

2. Wait for the first cycle to complete — most routes spend the
   first cycle on one-time setup (intro reveal, navigation to a
   starting cluster, etc.). Subsequent cycles are the recording
   target.

3. Hit record (QuickTime, OBS, ScreenStudio, Kap — your
   preference).

4. Capture from one loop seam to the next loop seam. The seam is
   the start state for that route — most are obvious from the
   route's name + the table above.

5. Stop recording. The clip should loop seamlessly because the
   start frame matches the end frame.

## Round-trip cleanness

Every single-gesture route is designed so the cycle's last frame
visually matches the first. Routes that needed extra work to
guarantee this:

- **`/showcase/select`** — uses `showProjectPanel(key)` (added to
  store) which sets selection state without firing the camera nav
  effect. Calling the regular `selectGroup()` would re-trigger the
  4.5 s camera tween every cycle; this just toggles the panel.
- **`/showcase/pan`** — pure flick-flick math drifts ~2 px from
  the original transform because the friction integrates to ~0.5 %
  of input velocity in residual displacement. The cycle ends with
  `navigateToGroup()` to recall the exact starting transform.
- **`/showcase/zoom-mobile` / `zoom-desktop`** — `zoomCameraBy`
  anchors on the viewport centre and uses a multiplicative
  factor, so 1.6× followed by 1/1.6× lands at the original scale
  without floating-point drift.
- **`/showcase/sheet`** — the content scroll explicitly returns
  to scrollTop = 0 inside the cycle; no residual scroll.

## Autopilot internals

```tsx
import { useAutopilot } from "@/components/demo/useAutopilot";
import { DemoFrame } from "@/components/demo/DemoFrame";

useAutopilot(async ({ wait, isInitial, cycle }) => {
  if (isInitial) {
    // one-time setup — fly to a cluster, expand a group, etc.
  }
  // loop body — runs every cycle, including the first
  someStoreAction();
  await wait(2000);
});
```

`wait()` rejects with a `CancelError` when the tab goes hidden;
the hook swallows it and re-runs the script on visibility resume.

## Store actions exposed for the autopilot suite

Production actions used as-is:
- `setSplashGone(boolean)` — gate the canvas's intro reveal
- `selectGroup(key)`, `selectWork(id, key)` — selection + camera
- `expandGroup(key)`, `collapseGroup()` — gallery FLIP
- `navigateToGroup(key)` — fly camera to a cluster
- `closeProject()`, `deselect()` — clear selection
- `resetToOverview()` — logo-click cascade back to bento
- `setInspectorSheetSnap("peek" | "mid" | "full" | null)` — sheet snap

Added for the demo suite:
- `replayIntro()` — bump a token; useCanvas resets userInteractedRef,
  snaps to 75 %-bento, animates back to 100 %
- `flickPan(vx, vy)` — bump a token + velocity; useCanvas seeds
  velocityRef and starts the same kinetic inertia rAF loop a real
  release fires
- `zoomCameraBy(factor, durationMs)` — bump a token + factor; both
  useCanvas (DOM) and CanvasPixi (WebGL) animate `transform.scale`
  by the supplied factor centred on the viewport, driving the same
  clampedZoom / dispersion path real wheel/pinch fires
- `showProjectPanel(key)` — set selection state without the camera
  nav target (selectGroup minus navTargetGroupKey)
- `setInspectorSheetDragDelta(deltaY | null)` — programmatic sheet
  drag override; sheet renders at peek + delta with no transition
- `releaseSheetDrag()` — clear the override; sheet snaps to nearest
  state from the held delta (production snap-to-nearest logic)
- `scrollSheetContentTo(top, durationMs)` — animate the sheet's
  scrollable content area to a target scrollTop

## Window flags (set synchronously at module-load, before mount)

- `__FAST_INTRO__` — halve the canvas intro reveal duration
  (3.5 s vs production 6 s)
- `__FORCE_MOBILE__` — make `<ViewSwitcher>` unconditionally
  render the mobile branch (Pixi + InspectorSheet) regardless of
  viewport size

## Status report (per spec)

**Routes that round-trip cleanly with existing primitives:**
`/strip-desktop`, `/strip-mobile`, `/cluster`

**Routes that needed store extensions:**
- `/select` — added `showProjectPanel(key)` (selection without
  camera nav, otherwise the camera re-tweens every cycle)
- `/pan` — uses `flickPan(vx, vy)` (added previously) + recall via
  `navigateToGroup` for exact round-trip
- `/zoom-mobile`, `/zoom-desktop` — added `zoomCameraBy(factor,
  durationMs)` to both useCanvas and CanvasPixi
- `/sheet` — added `setInspectorSheetSnap` interplay with
  `scrollSheetContentTo(top, durationMs)`
- `/sheet-snap` — added `setInspectorSheetDragDelta` +
  `releaseSheetDrag` for programmatic partial-drag-and-snap

**Production sheet & partial-drag-and-snap:**
Production InspectorSheet ALREADY supports partial-drag-and-snap
via real touch (the existing onGrabPointerUp computes the nearest
snap from the live `dragDelta`). The `/sheet-snap` route calls
through a programmatic entry point so the autopilot can drive the
same flow without simulating pointer events. No production
behaviour was changed — just exposed.

**Cluster + image picks:**
- `/showcase/cluster` — Bodies Under Construction (5 × 4 grid,
  most visually distinct cluster shape).
- `/showcase/select` — Bodies Under Construction (same reason —
  panel content is rich for the recording).
- `/showcase/strip-desktop`, `/showcase/strip-mobile` — Bodies
  Under Construction, image `bodies-04`.

**Round-trip seams to verify:**
- `/pan` recall is mathematically exact via `navigateToGroup`,
  but the recall animation is visible (camera moves back over
  ~1 s). If the recall trajectory is undesirable, replace with
  a transform-snap action that doesn't animate.
- `/zoom-mobile` and `/zoom-desktop` — verify the dispersion-tracker
  fires on both threshold crosses (1.0 / 1.25 of bentoFit). If
  tiles get stuck mid-dispersion at the loop seam, the zoom
  durations may need to outlast the tile transition (2.8 s).

**Mobile routes from desktop browser:**
All mobile routes set `__FORCE_MOBILE__ = true` synchronously at
module-load time, so they render correctly in any browser
regardless of viewport size. For visual fidelity, open Chrome
at a phone-width window or use DevTools mobile emulation.
