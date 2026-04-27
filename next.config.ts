import type { NextConfig } from "next";

// Static export for GitHub Pages. The basePath is set by the deploy workflow
// (NEXT_PUBLIC_BASE_PATH=/karim-boumjimar) so locally `pnpm dev` and
// `pnpm build` still serve from the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // GitHub Pages serves directories with trailing slashes, and serves
  // index.html on directory hits — this matches that convention.
  trailingSlash: true,
  images: {
    // Static export can't use Next's image optimization runtime.
    unoptimized: true,
  },
  // Allow LAN-IP access during dev so the site can be tested from another
  // device on the same network (phone, tablet, second machine).
  allowedDevOrigins: ["192.168.178.75"],
};

export default nextConfig;
