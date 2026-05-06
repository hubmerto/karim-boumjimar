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
};

export default nextConfig;
