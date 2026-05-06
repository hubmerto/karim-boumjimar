# Karim Boumjimar - Portfolio

Single-viewport canvas portfolio for ceramic artist Karim Boumjimar.
Next.js 16 (App Router) + Tailwind 4 + Zustand + Sharp.

**Live:** https://www.karimboumjimar.com (Vercel)
**Backup mirror:** https://hubmerto.com/karim-boumjimar/ (GitHub Pages, do not edit through here)

## Continuing on another machine

```bash
git clone https://github.com/hubmerto/karim-boumjimar.git
cd karim-boumjimar

# Install Node + pnpm if you don't already have them.
# Fastest path without Homebrew:
curl -L https://github.com/Schniz/fnm/releases/latest/download/fnm-macos.zip -o /tmp/fnm.zip
mkdir -p ~/.fnm && unzip -o /tmp/fnm.zip -d ~/.fnm && chmod +x ~/.fnm/fnm
echo 'export PATH="$HOME/.fnm:$PATH"' >> ~/.zprofile
echo 'eval "$(fnm env --use-on-cd --shell zsh)"' >> ~/.zprofile
export PATH="$HOME/.fnm:$PATH" && eval "$(fnm env --shell zsh)"
fnm install --lts
corepack enable && corepack prepare pnpm@latest --activate

# Then:
pnpm install
pnpm dev   # http://localhost:3000
```

If you already have Node 20+ and pnpm: just `pnpm install && pnpm dev`.

## Project shape

```
src/
  app/                   Root layout + page (App Router)
  components/            Canvas, Inspector, ProjectPanel, LeftToolbar, ...
  components/views/      Bio / About / News / Grant text views
  data/
    works.ts             41 work tiles with positions (generated)
    bio.ts               bio paragraphs, news, grant info
    descriptions.ts      long-form project descriptions
  lib/
    canvas-math.ts       fitAll / centerOn / zoomAt
    useCanvas.ts         pan/zoom hook (wheel, drag, pinch, keyboard)
    store.ts             zustand selection + view state
    paths.ts             basePath helper for static export
scripts/                 Asset pipeline (run via node)
public/images/
  works/                 canvas-ready WebPs (committed)
  originals/             full-res JPGs (gitignored)
```

## Editing content

- Bio / About text - `src/data/bio.ts` (`BIO_PARAGRAPHS`, `ABOUT_PARAGRAPHS`)
- News timeline - same file (`NEWS` array)
- Project descriptions - `src/data/descriptions.ts`
- Tile positions / clusters - `scripts/build-works.mjs` (CLUSTERS object), then re-run `node scripts/build-works.mjs`

## Re-running the asset pipeline

If you change which images are picked, or add new ones:

```bash
curl -sL https://www.karimboumjimar.com/sitemap.xml -o /tmp/sitemap.xml

# Build manifest from sitemap
python3 -c "
import xml.etree.ElementTree as ET, json
tree = ET.parse('/tmp/sitemap.xml')
ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9', 'image': 'http://www.google.com/schemas/sitemap-image/1.1'}
manifest = []
for url in tree.getroot().findall('sm:url', ns):
    loc = url.find('sm:loc', ns).text
    slug = loc.rsplit('/', 1)[-1]
    images = [{'url': i.find('image:loc', ns).text, 'title': (i.find('image:title', ns) or {}).text if i.find('image:title', ns) is not None else None, 'caption': (i.find('image:caption', ns) or {}).text if i.find('image:caption', ns) is not None else None} for i in url.findall('image:image', ns)]
    manifest.append({'page': loc, 'slug': slug, 'images': images})
print(json.dumps(manifest, indent=2, ensure_ascii=False))
" > /tmp/manifest.json

node scripts/curate.mjs        # picks images, writes scripts/curated.json
node scripts/download.mjs      # downloads to public/images/originals/
node scripts/to-webp.mjs       # converts to public/images/works/
node scripts/build-works.mjs   # regenerates src/data/works.ts
```

## Deploying

Every push to `main` triggers two deploys in parallel:

- **Vercel** (primary, https://www.karimboumjimar.com) — runtime build, image optimization on. Configured in the Vercel dashboard; nothing in the repo to maintain.
- **GitHub Pages** (mirror, https://hubmerto.com/karim-boumjimar/) — static export driven by `.github/workflows/deploy.yml`. Sets `STATIC_EXPORT=1` and `NEXT_PUBLIC_BASE_PATH=/karim-boumjimar`. Kept as a backup; the canonical URL points to the Vercel domain.

Local builds default to the Vercel-style config. To produce the static mirror locally:

```bash
STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH=/karim-boumjimar pnpm build
# Output goes to ./out
```
