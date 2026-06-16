import type { NextConfig } from "next";

// Two deploy targets:
//  1. Vercel — runtime server, image optimization on, no basePath, no
//     trailing slash. The default when no env vars are set.
//  2. GitHub Pages — static export with `STATIC_EXPORT=1` and
//     `NEXT_PUBLIC_BASE_PATH=/karim-boumjimar` set in the deploy
//     workflow. Trailing slashes + unoptimized images.
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Only emit a static export when explicitly building for GH Pages.
  // On Vercel we want the runtime so <Image> can optimize on the fly.
  ...(isStaticExport ? { output: "export" as const } : {}),
  basePath,
  // GitHub Pages serves directories with trailing slashes, and serves
  // index.html on directory hits — this matches that convention.
  // Vercel doesn't need it, and turning it on there would cause
  // unnecessary 308 redirects.
  trailingSlash: isStaticExport,
  images: {
    // Static export can't use Next's image optimization runtime, so we
    // ship raw resized files. On Vercel we let the platform transcode
    // to WebP/AVIF and resize on demand.
    unoptimized: isStaticExport,
  },
  // Allow LAN-IP access during dev so the site can be tested from another
  // device on the same network (phone, tablet, second machine).
  allowedDevOrigins: ["192.168.178.75"],
  // Hide the N / build-activity indicator that pops in the corner during
  // dev (it never ships to production but distracts during local review).
  devIndicators: false,
  // Ship source maps to production so mobile crash stacks are decodable.
  // Adds ~2x JS file count to the deploy but no runtime cost (only fetched
  // when DevTools is open).
  productionBrowserSourceMaps: true,
  // Squarespace -> Next migration cleanup (June 2026). Karim's old
  // Squarespace site exposed dozens of per-work, store, and item routes
  // that don't exist on this single-canvas portfolio. Google still has
  // them indexed and they 404 in Search Console. We 301 each old URL to
  // its closest home so link equity carries over and the 404s clear.
  //
  // Notes:
  //  - Path matching ignores the query string, so one rule per slug also
  //    covers every old `?itemId=...` deep link (e.g. /sculptures and
  //    /sculptures?itemId=xyz both hit the /sculptures rule).
  //  - redirects() are a no-op under `output: "export"`, so we only attach
  //    them on the Vercel (runtime) build. The GitHub Pages mirror is a
  //    backup and not the indexed property.
  ...(isStaticExport
    ? {}
    : {
        async redirects() {
          // Old slugs that have a direct semantic home on the new site.
          const semantic = [
            { source: "/home", destination: "/" },
            { source: "/exhibitions", destination: "/" },
            { source: "/grants", destination: "/grant" },
            // Bio page holds the full CV (statement, education, contact).
            { source: "/cvs", destination: "/bio" },
            // About page holds the contact email + Instagram.
            { source: "/contact", destination: "/about" },
          ];

          // Old per-work / per-exhibition slugs. The canvas site has no
          // per-project pages, so they all resolve to the main view. Each
          // rule also catches that slug's old `?itemId=...` deep links.
          const works = [
            "/drawing",
            "/sculptures",
            "/mouths",
            "/pandemonium",
            "/fearandfauna",
            "/birdsofparadise",
            "/young-boy-dancing-group",
            "/kultuur",
            "/moestings",
            "/cruising",
            "/overgaden",
            "/glory",
            "/alicefolker",
            "/new-page",
          ].map((source) => ({ source, destination: "/" }));

          // Old Squarespace commerce + video sections, with all sub-paths.
          // Clears the /store 401 and the /cart noindex too.
          const sections = [
            { source: "/store/:path*", destination: "/" },
            { source: "/cart", destination: "/" },
            { source: "/video/:path*", destination: "/" },
          ];

          return [...semantic, ...works, ...sections].map((r) => ({
            ...r,
            permanent: true,
          }));
        },
      }),
};

export default nextConfig;
