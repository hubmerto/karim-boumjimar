export type Medium =
  | "ceramic"
  | "drawing"
  | "mixed"
  | "publication"
  | "performance";

export type WorkImage = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export type Work = {
  id: string;
  title: string;
  year: number | string;
  medium: Medium;
  materials?: string;
  dimensions?: string;
  exhibition?: string;
  venue?: string;
  city?: string;
  date?: string;
  photoCredit?: string;
  collection?: string;
  images: WorkImage[];
  /** Canvas coordinates. Document-wide range: -4000 to +4000 on each axis. */
  position: { x: number; y: number };
  /** Rendered width on the canvas at zoom 1, in CSS pixels. */
  width: number;
};
