import { create } from "zustand";

export type View = "exhibitions" | "news" | "bio" | "about" | "grant";

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
  /** Project key (`title|year`) of the project gallery currently open
   * over the Pixi canvas, or null. Lifted to the store so MobileNav
   * can hide its tab links when a gallery is up. */
  openProjectKey: string | null;
  setOpenProjectKey: (key: string | null) => void;
  /** True once the splash logo has fully faded out (or was skipped via the
   * sessionStorage cache). Tiles wait on this to start their fade-in so the
   * animation isn't wasted behind the splash. */
  splashGone: boolean;
  setSplashGone: (v: boolean) => void;
  select: (id: string | null) => void;
  /** Click a tile: highlights that tile, pins its group, and zooms to the group. */
  selectWork: (id: string, groupKey: string) => void;
  selectGroup: (key: string | null) => void;
  /** Closes only the right-side TITLE/YEAR Inspector. */
  closeInspector: () => void;
  /** Closes only the rightmost project description panel. */
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
    }),
  selectedId: null,
  selectedGroupKey: null,
  expandedGroupKey: null,
  navTargetWorkId: null,
  navTargetGroupKey: null,
  indexOpen: false,
  setIndexOpen: (open) => set({ indexOpen: open }),
  openProjectKey: null,
  setOpenProjectKey: (key) => set({ openProjectKey: key }),
  splashGone: false,
  setSplashGone: (v) => set({ splashGone: v }),
  select: (id) => set({ selectedId: id }),
  selectWork: (id, groupKey) =>
    set({
      selectedId: id,
      selectedGroupKey: groupKey,
      navTargetGroupKey: groupKey,
    }),
  selectGroup: (key) =>
    set({
      selectedGroupKey: key,
      selectedId: null,
      navTargetGroupKey: key,
    }),
  closeInspector: () => set({ selectedId: null }),
  // Closing the project sidebar should NOT kill the gallery. Gallery view
  // is independent and may be exited via its own close affordances.
  closeProject: () => set({ selectedGroupKey: null }),
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
    }),
  navigateToGroup: (key) =>
    set({
      navTargetGroupKey: key,
      selectedGroupKey: key,
      selectedId: null,
      expandedGroupKey: null,
      view: "exhibitions",
    }),
  clearNav: () => set({ navTargetWorkId: null, navTargetGroupKey: null }),
}));
