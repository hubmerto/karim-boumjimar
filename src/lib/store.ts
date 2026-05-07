import { create } from "zustand";

export type View = "exhibitions" | "news" | "bio" | "about" | "grant";

/** Mobile InspectorSheet snap states. Mirrors the local Snap union
 * inside InspectorSheet.tsx — duplicated here because the type
 * lives in a non-exported file and the showcase route needs to
 * dispatch snap changes from outside the sheet. */
export type InspectorSheetSnap = "peek" | "mid" | "full";

type CanvasState = {
  view: View;
  setView: (v: View) => void;
  selectedId: string | null;
  /** Group identity when an outline is clicked but no specific tile is chosen. */
  selectedGroupKey: string | null;
  /** When set, the canvas shows a horizontal full-height strip of this group's works. */
  expandedGroupKey: string | null;
  /** Pan/zoom request to a single work id (set by Index, top-bar reset, etc.). */
  navTargetWorkId: string | null;
  /** Pan/zoom request to a group's bounding box (set by group outline click). */
  navTargetGroupKey: string | null;
  /** Whether the Works Index drawer is open. Lifted out of LeftToolbar so the
   * mobile menu can open it too. */
  indexOpen: boolean;
  setIndexOpen: (open: boolean) => void;
  /** Whether the desktop LeftToolbar is slid off-screen. Kept separate
   * from the selection state so closing the right-side panels (via ×,
   * Esc, canvas-bg click, zoom-out, etc.) doesn't auto-pop the toolbar
   * back in. The user opens it explicitly via the › handle (which also
   * deselects) or by changing view via the top bar. */
  toolbarHidden: boolean;
  /** Reveal the toolbar AND clear any selection. Used by the › handle. */
  showToolbar: () => void;
  /** True once the splash logo has fully faded out (or was skipped via the
   * sessionStorage cache). Tiles wait on this to start their fade-in so the
   * animation isn't wasted behind the splash. */
  splashGone: boolean;
  setSplashGone: (v: boolean) => void;
  select: (id: string | null) => void;
  /** Click a tile: highlights that tile, pins its group, and zooms to the group. */
  selectWork: (id: string, groupKey: string) => void;
  selectGroup: (key: string | null) => void;
  /** Closes the merged ProjectPanel (work fields + project description). */
  closeProject: () => void;
  deselect: () => void;
  /** Open the horizontal full-height strip view for the given group. */
  expandGroup: (key: string) => void;
  /** Close the horizontal strip view, returning to the spotlight. */
  collapseGroup: () => void;
  /** Trigger a canvas pan to a work, also selecting it. */
  navigateTo: (id: string) => void;
  /** Trigger a canvas fit-to-group, spotlighting that exhibition. */
  navigateToGroup: (key: string) => void;
  /** Counter bumped each time the user explicitly asks to return
   * to the bento overview (top-bar logo click). Canvas hooks watch
   * this and animate the camera back to the fit-all bento target. */
  navResetOverviewToken: number;
  /** Counter bumped to retrigger the canvas's intro reveal animation
   * (75 % → 100 % bento with the staggered tile fade-in). The /showcase
   * /bento-entry demo bumps this to loop the entry. Canvas hooks
   * reset their userInteraction gate + re-run the reveal effect when
   * this changes. */
  introReplayToken: number;
  replayIntro: () => void;
  /** Counter + last-injected pan velocity for /showcase/inertia.
   * useCanvas reads `flickPanVx` / `flickPanVy` whenever
   * `flickPanToken` bumps and seeds its kinetic inertia loop with
   * those values. px / ms in screen space; positive vx = pan canvas
   * right, positive vy = pan canvas down. */
  flickPanToken: number;
  flickPanVx: number;
  flickPanVy: number;
  flickPan: (vx: number, vy: number) => void;
  /** Programmatic override for the mobile InspectorSheet snap.
   * `null` = sheet uses its internal default behaviour (peek when a
   * group selects, etc.). Any string forces the sheet to that snap
   * state. Used by /showcase/mobile to pull the tab up + down. */
  inspectorSheetSnap: InspectorSheetSnap | null;
  setInspectorSheetSnap: (snap: InspectorSheetSnap | null) => void;
  /** Reset to the home/overview state — clears selection, view,
   * toolbarHidden, and bumps navResetOverviewToken so the camera
   * animates back to the bento. */
  resetToOverview: () => void;
  clearNav: () => void;
};

export const useSelection = create<CanvasState>((set) => ({
  view: "exhibitions",
  setView: (v) =>
    set({
      view: v,
      selectedId: null,
      selectedGroupKey: null,
      expandedGroupKey: null,
      // Switching views is an explicit navigation, so the toolbar
      // should be visible on the destination route.
      toolbarHidden: false,
    }),
  selectedId: null,
  selectedGroupKey: null,
  expandedGroupKey: null,
  navTargetWorkId: null,
  navTargetGroupKey: null,
  indexOpen: false,
  setIndexOpen: (open) => set({ indexOpen: open }),
  toolbarHidden: false,
  showToolbar: () =>
    set({
      toolbarHidden: false,
      selectedId: null,
      selectedGroupKey: null,
      expandedGroupKey: null,
    }),
  splashGone: false,
  setSplashGone: (v) => set({ splashGone: v }),
  select: (id) => set({ selectedId: id }),
  selectWork: (id, groupKey) =>
    set({
      selectedId: id,
      selectedGroupKey: groupKey,
      navTargetGroupKey: groupKey,
      toolbarHidden: true,
    }),
  selectGroup: (key) =>
    set({
      selectedGroupKey: key,
      selectedId: null,
      navTargetGroupKey: key,
      toolbarHidden: true,
    }),
  // Closing the panel clears BOTH the work selection and the group
  // selection — there's no longer a separate Inspector aside, so
  // there's nothing left to keep the work-only state pinned for.
  closeProject: () =>
    set({ selectedId: null, selectedGroupKey: null }),
  // Generic deselect — used by zoom-out, canvas-bg click, Esc, the
  // GroupViewControls × button. Deliberately does NOT touch
  // toolbarHidden: those exits are about the project context, not a
  // request to bring the site nav back.
  deselect: () =>
    set({ selectedId: null, selectedGroupKey: null, expandedGroupKey: null }),
  expandGroup: (key) => set({ expandedGroupKey: key, selectedGroupKey: key }),
  // Closing the gallery just unmounts it. The FLIP-close in
  // ExpandedGroup already animates each tile back to its canvas-tile
  // rect; the camera stays put so the user lands exactly where the
  // group already is, no re-zoom.
  collapseGroup: () => set({ expandedGroupKey: null }),
  navigateTo: (id) =>
    set({
      navTargetWorkId: id,
      selectedId: id,
      selectedGroupKey: null,
      expandedGroupKey: null,
      view: "exhibitions",
      toolbarHidden: true,
    }),
  navigateToGroup: (key) =>
    set({
      navTargetGroupKey: key,
      selectedGroupKey: key,
      selectedId: null,
      expandedGroupKey: null,
      view: "exhibitions",
      toolbarHidden: true,
    }),
  navResetOverviewToken: 0,
  introReplayToken: 0,
  replayIntro: () =>
    set((s) => ({ introReplayToken: s.introReplayToken + 1 })),
  flickPanToken: 0,
  flickPanVx: 0,
  flickPanVy: 0,
  flickPan: (vx, vy) =>
    set((s) => ({
      flickPanToken: s.flickPanToken + 1,
      flickPanVx: vx,
      flickPanVy: vy,
    })),
  inspectorSheetSnap: null,
  setInspectorSheetSnap: (snap) => set({ inspectorSheetSnap: snap }),
  resetToOverview: () =>
    set((s) => ({
      view: "exhibitions",
      selectedId: null,
      selectedGroupKey: null,
      expandedGroupKey: null,
      navTargetWorkId: null,
      navTargetGroupKey: null,
      toolbarHidden: false,
      navResetOverviewToken: s.navResetOverviewToken + 1,
    })),
  clearNav: () => set({ navTargetWorkId: null, navTargetGroupKey: null }),
}));
