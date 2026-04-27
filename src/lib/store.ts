import { create } from "zustand";

export type View = "exhibitions" | "news" | "bio" | "about" | "grant";

type CanvasState = {
  view: View;
  setView: (v: View) => void;
  selectedId: string | null;
  /** Group identity when an outline is clicked but no specific tile is chosen. */
  selectedGroupKey: string | null;
  /** Pan/zoom request to a single work id (set by Index, top-bar reset, etc.). */
  navTargetWorkId: string | null;
  /** Pan/zoom request to a group's bounding box (set by group outline click). */
  navTargetGroupKey: string | null;
  select: (id: string | null) => void;
  selectGroup: (key: string | null) => void;
  deselect: () => void;
  /** Trigger a canvas pan to a work, also selecting it. */
  navigateTo: (id: string) => void;
  /** Trigger a canvas fit-to-group, spotlighting that exhibition. */
  navigateToGroup: (key: string) => void;
  clearNav: () => void;
};

export const useSelection = create<CanvasState>((set) => ({
  view: "exhibitions",
  setView: (v) => set({ view: v, selectedId: null, selectedGroupKey: null }),
  selectedId: null,
  selectedGroupKey: null,
  navTargetWorkId: null,
  navTargetGroupKey: null,
  select: (id) => set({ selectedId: id }),
  selectGroup: (key) =>
    set({
      selectedGroupKey: key,
      selectedId: null,
      navTargetGroupKey: key,
    }),
  deselect: () => set({ selectedId: null, selectedGroupKey: null }),
  navigateTo: (id) =>
    set({
      navTargetWorkId: id,
      selectedId: id,
      selectedGroupKey: null,
      view: "exhibitions",
    }),
  navigateToGroup: (key) =>
    set({
      navTargetGroupKey: key,
      selectedGroupKey: key,
      selectedId: null,
      view: "exhibitions",
    }),
  clearNav: () => set({ navTargetWorkId: null, navTargetGroupKey: null }),
}));
