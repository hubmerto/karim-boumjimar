// Minimal type stub for the gif.js library — only the surface the
// /showcase/tornado/gif route uses. The real package ships no
// type defs; the JS API is documented at
// https://github.com/jnordberg/gif.js#readme

declare module "gif.js" {
  interface GifFrameOptions {
    delay?: number; // ms
    copy?: boolean;
    dispose?: number;
  }
  interface GifOptions {
    workers?: number;
    quality?: number; // 1 = best, 30 = fastest
    workerScript?: string;
    width?: number;
    height?: number;
    transparent?: number | null; // 0xRRGGBB
    background?: string;
    repeat?: number; // 0 = forever, -1 = no repeat
    debug?: boolean;
    dither?: boolean | string;
  }

  type GifEventName = "abort" | "finished" | "progress" | "start";

  class Gif {
    constructor(options: GifOptions);
    addFrame(
      image:
        | HTMLCanvasElement
        | HTMLImageElement
        | CanvasRenderingContext2D
        | ImageData,
      options?: GifFrameOptions,
    ): void;
    on(event: "finished", cb: (blob: Blob) => void): void;
    on(event: "progress", cb: (pct: number) => void): void;
    on(event: "start", cb: () => void): void;
    on(event: "abort", cb: () => void): void;
    on(event: GifEventName, cb: (...args: unknown[]) => void): void;
    render(): void;
    abort(): void;
  }

  export default Gif;
}
