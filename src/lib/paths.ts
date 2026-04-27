/**
 * Static-export base path. Set at build time via NEXT_PUBLIC_BASE_PATH
 * (the GitHub Pages workflow injects "/karim-boumjimar"). Empty in dev.
 *
 * Use `asset()` for any raw `<img src>` or `href` to a public/ asset -
 * `next/image` and `<Link>` already handle basePath automatically.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function asset(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}
