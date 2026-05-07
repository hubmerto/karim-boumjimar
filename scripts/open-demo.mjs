// Open any /showcase/* demo route in a fresh Chrome window sized
// to its recommended viewport. Also prints sharable URLs:
//
//   - localhost:    open on the dev machine
//   - network:      open on a phone / tablet on the same WiFi
//                   (requires `pnpm dev:net` instead of `pnpm dev`
//                   so Next.js binds to 0.0.0.0)
//   - production:   visit on any device once Vercel has deployed
//                   the latest push (https://www.karimboumjimar.com)
//
// Usage:
//   pnpm demo <route>          # opens at recommended viewport
//   pnpm demo                  # prints the menu of routes
//   pnpm demo <route> --share  # only prints URLs, no Chrome window
//
// Examples:
//   pnpm demo sheet
//   pnpm demo zoom-desktop
//   pnpm demo strip-mobile --share

import { execFileSync } from "node:child_process";
import { networkInterfaces } from "node:os";

// Mobile target: 393 × 852 (iPhone 13/14/15 Pro logical resolution).
// Desktop target: 1280 × 800. The Chrome window height adds a fudge
// factor for the omnibox + tab bar (~80 px) so the actual viewport
// inside is close to the target.
const MOBILE_VIEWPORT = [393, 852];
const DESKTOP_VIEWPORT = [1280, 800];
const PHONE_FRAME_FUDGE = 80;

const ROUTES = {
  sheet: {
    desc: "sheet drag + content scroll",
    viewport: MOBILE_VIEWPORT,
    url: "/showcase/sheet",
  },
  "sheet-snap": {
    desc: "partial drag → snap to nearest",
    viewport: MOBILE_VIEWPORT,
    url: "/showcase/sheet-snap",
  },
  "zoom-mobile": {
    desc: "pinch outward → spread → pinch inward",
    viewport: MOBILE_VIEWPORT,
    url: "/showcase/zoom-mobile",
  },
  cluster: {
    desc: "tap cluster → strip → close",
    viewport: MOBILE_VIEWPORT,
    url: "/showcase/cluster",
  },
  "strip-mobile": {
    desc: "tap image → strip → close",
    viewport: MOBILE_VIEWPORT,
    url: "/showcase/strip-mobile",
  },
  "zoom-desktop": {
    desc: "same pinch, desktop renderer",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/zoom-desktop",
  },
  select: {
    desc: "cluster panel slides in / out",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/select",
  },
  "strip-desktop": {
    desc: "same as strip-mobile, desktop",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/strip-desktop",
  },
  pan: {
    desc: "flick → glide → flick → recall",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/pan",
  },
  bento: {
    desc: "diamond appearing animation",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/bento-entry",
  },
  dispersion: {
    desc: "bento ↔ cluster",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/dispersion",
  },
  flip: {
    desc: "gallery FLIP open / close",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/flip",
  },
  "cluster-variation": {
    desc: "sweep through 5 cluster grids",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/cluster-variation",
  },
  inertia: {
    desc: "pan flicks → inertial glides",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/inertia",
  },
  "reset-cascade": {
    desc: "logo-reset cascade",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/reset-cascade",
  },
  "dual-renderer": {
    desc: "DOM + WebGL side-by-side",
    viewport: [1800, 900],
    url: "/showcase/dual-renderer",
  },
  "mobile-sheet": {
    desc: "sheet swipe up + down",
    viewport: MOBILE_VIEWPORT,
    url: "/showcase/mobile-sheet",
  },
  wordmark: {
    desc: "logo wordmark fade-in / dissolve",
    viewport: [1080, 720],
    url: "/showcase/wordmark",
  },
  navigation: {
    desc: "index drawer cycling projects",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/navigation",
  },
  mobile: {
    desc: "mobile gallery + sheet loop",
    viewport: MOBILE_VIEWPORT,
    url: "/showcase/mobile",
  },
  tornado: {
    desc: "photos swirl around their bento slot",
    viewport: DESKTOP_VIEWPORT,
    url: "/showcase/tornado",
  },
};

const PORT = process.env.PORT || "3000";
const PROD_HOST = "https://www.karimboumjimar.com";

function getLanIPs() {
  const ifs = networkInterfaces();
  const ips = [];
  for (const arr of Object.values(ifs)) {
    for (const i of arr || []) {
      if (i.family === "IPv4" && !i.internal) ips.push(i.address);
    }
  }
  return ips;
}

function printMenu() {
  console.log("Available demo routes:\n");
  const groups = {
    "Mobile gestures": [],
    "Desktop gestures": [],
    Other: [],
  };
  for (const [slug, info] of Object.entries(ROUTES)) {
    const isMobile =
      info.viewport[0] === MOBILE_VIEWPORT[0] &&
      info.viewport[1] === MOBILE_VIEWPORT[1];
    const isDesktop =
      info.viewport[0] === DESKTOP_VIEWPORT[0] &&
      info.viewport[1] === DESKTOP_VIEWPORT[1];
    const group = isMobile
      ? "Mobile gestures"
      : isDesktop
        ? "Desktop gestures"
        : "Other";
    groups[group].push({ slug, ...info });
  }
  for (const [name, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    console.log(`  ${name}:`);
    for (const item of items) {
      const slug = item.slug.padEnd(20);
      const dim = `${item.viewport[0]}×${item.viewport[1]}`.padEnd(11);
      console.log(`    ${slug} ${dim} ${item.desc}`);
    }
    console.log("");
  }
  console.log("Usage:");
  console.log("  pnpm demo <route>           # open in correctly sized Chrome");
  console.log("  pnpm demo <route> --share   # print URLs only");
  console.log("");
}

function printShareUrls(slug, info) {
  const ips = getLanIPs();
  const [w, h] = info.viewport;
  console.log(`\n${slug} — ${info.desc}`);
  console.log(`  ${w}×${h} viewport`);
  console.log("");
  console.log(`  Local:    http://localhost:${PORT}${info.url}`);
  for (const ip of ips) {
    console.log(`  WiFi:     http://${ip}:${PORT}${info.url}`);
  }
  console.log(`  Prod:     ${PROD_HOST}${info.url}`);
  console.log("");
  if (ips.length > 0) {
    console.log(
      "  → WiFi URL works on a phone on the same network when the dev",
    );
    console.log(
      "    server is started with `pnpm dev:net` (binds to 0.0.0.0).",
    );
  }
  console.log(
    "  → Prod URL works anywhere once Vercel has deployed the push to main.",
  );
  console.log("");
}

function openInChrome(info) {
  const [w, h] = info.viewport;
  const left = 100;
  const top = 80;
  const right = left + w;
  const bottom = top + h + PHONE_FRAME_FUDGE;
  const url = `http://localhost:${PORT}${info.url}`;
  // AppleScript content is built from validated constants only —
  // the route slug was already matched against the static ROUTES
  // map, so there's no path for arbitrary input to reach here.
  const script = `tell application "Google Chrome"
  activate
  set newWindow to (make new window)
  set bounds of newWindow to {${left}, ${top}, ${right}, ${bottom}}
  set URL of active tab of newWindow to "${url}"
end tell`;
  // Use execFileSync (no shell) so even though our inputs are
  // validated, we don't pay the shell-injection risk.
  execFileSync("osascript", ["-e", script], { stdio: "inherit" });
}

const arg = process.argv[2];
const flag = process.argv[3];

if (!arg || arg === "--help" || arg === "-h") {
  printMenu();
  process.exit(0);
}

const info = ROUTES[arg];
if (!info) {
  console.error(`Unknown route: ${arg}\n`);
  printMenu();
  process.exit(1);
}

if (flag === "--share") {
  printShareUrls(arg, info);
} else {
  openInChrome(info);
  printShareUrls(arg, info);
}
