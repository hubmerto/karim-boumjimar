// Parse the text files in /tmp/karim-uploads/02_text/ and emit src/data/bio.ts
// with the new content. Preserves the existing exports (ABOUT_PARAGRAPHS,
// BIO_PARAGRAPHS, NEWS, CONTACT, etc) but with the new content from
// the artist's upload folder.
//
// Run: pnpm exec node scripts/import-text.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = "/tmp/karim-uploads/02_text";

function read(name) {
  const p = resolve(SRC, name);
  if (!existsSync(p)) {
    console.warn(`! missing ${name}`);
    return "";
  }
  return readFileSync(p, "utf8");
}

// Drop the comment header and footer (lines starting with --- or first
// title line), return content paragraphs split by blank lines.
function paragraphs(text) {
  // Remove --- comment blocks (up to and including the next blank line)
  const lines = text.split(/\r?\n/);
  const content = [];
  let inFooter = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Skip first title line (no --- markers, no body yet) and --- comments.
    if (l.startsWith("---")) continue;
    // Skip the header title (first non-empty line) — we don't include it.
    if (content.length === 0 && l.trim() && i < 5 && !l.startsWith("Karim")) continue;
    content.push(l);
  }
  // Now collapse and split by blank lines
  return content
    .join("\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("---"));
}

// News parsing: format is DATE\nTEXT(maybe multiline)\nURL(optional)\n
// blocks separated by blank lines.
function parseNews(text) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b);
  const entries = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter((l) => l);
    if (lines.length < 2) continue;
    if (lines[0].startsWith("---") || lines[0] === "News") continue;
    const date = lines[0];
    let url;
    let textLines = lines.slice(1);
    // Last line is URL if it starts with http
    if (textLines[textLines.length - 1]?.startsWith("http")) {
      url = textLines.pop();
    }
    const text = textLines.join(" ").trim();
    if (!date || !text) continue;
    entries.push(url ? { date, text, url } : { date, text });
  }
  return entries;
}

function parseContact(text) {
  const out = { email: "", instagram: "", instagramUrl: "" };
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(EMAIL|INSTAGRAM HANDLE|INSTAGRAM URL):\s*(.+)$/);
    if (!m) continue;
    const v = m[2].trim().replace(/\[at\]/g, "@");
    if (m[1] === "EMAIL" && !out.email) out.email = v.split(/\s+/)[0];
    else if (m[1] === "INSTAGRAM HANDLE") out.instagram = v;
    else if (m[1] === "INSTAGRAM URL") out.instagramUrl = v;
  }
  return out;
}

function parseGrant(text) {
  const intro = text.match(/INTRO:\s*([\s\S]+?)(?:\n\s*BODY:|\nBODY:)/i);
  const bodyStart = text.indexOf("BODY:");
  const applyMatch = text.match(/TO APPLY:\s*([\s\S]+?)(?:\n\s*APPLICATION CHECKLIST:|$)/i);
  const checkMatch = text.match(/APPLICATION CHECKLIST:\s*([\s\S]+?)$/i);
  let body = [];
  if (bodyStart !== -1) {
    const after = text.slice(bodyStart + "BODY:".length);
    const upTo = after.search(/TO APPLY:/i);
    const slice = upTo !== -1 ? after.slice(0, upTo) : after;
    body = slice.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p);
  }
  const apply = applyMatch ? applyMatch[1].trim() : "";
  const emailM = apply.match(/email\s+(\S+)/i);
  const subjM = apply.match(/subject\s+"([^"]+)"/i);
  const checklist = checkMatch
    ? checkMatch[1].split(/\r?\n/).map((l) => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean)
    : [];
  return {
    intro: intro ? intro[1].trim() : "",
    body,
    applyEmail: emailM ? emailM[1].replace(/[.,;]$/, "") : "karim@karimboumjimar.com",
    applySubject: subjM ? subjM[1] : "Grant: Your Name",
    applyChecklist: checklist,
  };
}

function parsePublicCollections(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-\s*/, "").trim());
}

function quote(s) {
  return JSON.stringify(s);
}

function arr(items, indent = 2) {
  if (!items.length) return "[]";
  const pad = " ".repeat(indent);
  return "[\n" + items.map((x) => `${pad}${typeof x === "string" ? quote(x) : JSON.stringify(x)},`).join("\n") + `\n${" ".repeat(indent - 2)}]`;
}

const aboutText = read("about.txt");
const bioText = read("bio.txt");
const newsText = read("news.txt");
const contactText = read("contact.txt");
const grantText = read("grant.txt");
const publicText = read("public-collections.txt");

const ABOUT = paragraphs(aboutText);
const BIO = paragraphs(bioText);
const NEWS = parseNews(newsText);
const CONTACT = parseContact(contactText);
const GRANT = parseGrant(grantText);
const COLLECTIONS = parsePublicCollections(publicText);

console.log({
  about: ABOUT.length,
  bio: BIO.length,
  news: NEWS.length,
  contact: CONTACT,
  grant_body: GRANT.body.length,
  collections: COLLECTIONS.length,
});

const out = `// Generated by scripts/import-text.mjs from /tmp/karim-uploads/02_text/.

export const ARTIST_NAME = "Karim Boumjimar";

export const BIO_SHORT = ${quote(ABOUT[0] || "")};

/**
 * Artist statement, used by AboutView.
 */
export const ABOUT_PARAGRAPHS = ${arr(ABOUT)};

/**
 * Biographical paragraphs, used by BioView. CV-style.
 */
export const BIO_PARAGRAPHS = ${arr(BIO)};

/** Inspector default state - uses the artist statement as the canonical bio. */
export const BIO_LONG = ABOUT_PARAGRAPHS;

/** Public collections holding Boumjimar's work. */
export const PUBLIC_COLLECTIONS = ${arr(COLLECTIONS)};

/** Recognition / honours. */
export const RECOGNITION = [
  { year: "2026", text: "Carl Nielsen and Anne Marie Carl-Nielsen Scholarship; working grant, Danish Arts Foundation" },
  { year: "2025", text: "Ulrica Hydman Vallien Foundation Talent Scholarship" },
  { year: "2025", text: "Symbiosis received the 2025 Blix Prize" },
  { year: "2025", text: "Named one of the Ten Artists to Watch in 2025 by Frieze" },
];

export const REPRESENTATION = [
  {
    name: "Alice Folker Gallery",
    city: "Copenhagen",
    url: "https://alicefolker.dk/artists/33-karim-boumjimar/overview/",
  },
  {
    name: "Helsinki Contemporary",
    city: "Helsinki",
    url: "https://helsinkicontemporary.com/artists/karim-boumjimar",
  },
] as const;

export const CONTACT = {
  email: ${quote(CONTACT.email || "karim@karimboumjimar.com")},
  instagram: ${quote(CONTACT.instagram || "@beigetype")},
  instagramUrl: ${quote(CONTACT.instagramUrl || "https://www.instagram.com/beigetype/")},
};

export type NewsEntry = {
  date: string;
  text: string;
  url?: string;
};

/** Reverse-chronological. */
export const NEWS: NewsEntry[] = ${JSON.stringify(NEWS, null, 2)};

export type ExhibitionEntry = {
  year: string;
  title: string;
  venue: string;
  city?: string;
  date?: string;
  type?: "solo" | "group" | "duo" | "performance";
};

export const EXHIBITIONS: ExhibitionEntry[] = [];

export const GRANT_INFO = {
  title: "Working-Class Creative Grant",
  intro: ${quote(GRANT.intro)},
  body: ${arr(GRANT.body)},
  applyEmail: ${quote(GRANT.applyEmail)},
  applySubject: ${quote(GRANT.applySubject)},
  applyChecklist: ${arr(GRANT.applyChecklist)},
};
`;

writeFileSync(resolve(root, "src/data/bio.ts"), out);
console.log(`Wrote src/data/bio.ts`);
