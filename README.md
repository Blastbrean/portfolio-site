# blastbrean.com

A static Astro portfolio. Content is Markdown; layouts handle presentation.
A GitHub Pages deployment workflow is prepared; activate it using the setup below.

The theme follows the visitor's system setting by default. The header's Theme
selector offers System, Light, and Dark. Dark mode uses warm charcoal with dusty rose and lilac
accents; light mode uses cream, pale yellow, and blue. Explicit choices are remembered
in the browser and shared across tabs. System follows live OS changes. Without
JavaScript, the site still follows the system theme.

## Run locally

Use Node 24 and pnpm:

```sh
fnm use
pnpm install
pnpm dev
```

Open http://localhost:4321. Save a content or layout file to update the preview.
Astro prints a different port if 4321 is in use. Use the stop instructions printed
by your installed Astro version when finished.

## Write your content

| Page | File |
| --- | --- |
| Home: what you do and your experience | `src/pages/index.md` |
| Contact, freelancing, timezone, availability | `src/pages/contact.md` |
| Work gallery introduction | `src/pages/work.md` |
| Forgejo and GitHub links | `src/pages/projects.md` |

Navigation is ordered Home, Work, Projects, Contact. The Projects page links to
Forgejo at https://git.blastbrean.com and GitHub at https://github.com/Blastbrean.

## Display requirements

Responsive scaling is a standing requirement: the site must be easy to read and
navigate on mobile, tablet, desktop, and TV-sized displays, including intermediate
widths and browser zoom. See `REQUIREMENTS.md` for acceptance criteria.

Keep each file's `---` frontmatter block. Write below it using headings, paragraphs,
links, lists, code blocks, and images. HTML comments are writing prompts and do
not appear on the page. Replace the visible "not added yet" placeholders with
your actual details. No personal contact details or availability are inferred.

## Favicon and browser tab titles

Edit `src/site.ts` to change the shared site name and favicon path.
The starter favicon is `public/favicon.svg`. To use your own image, put a square
PNG (for example, 256 × 256 pixels) at `public/favicon.png`, then set:

```ts
favicon: '/favicon.png',
```

SVG and ICO files work too. The public path omits `public/`. Browsers cache
favicons aggressively; if an old icon persists, change the filename or use
`'/favicon.png?v=2'` in the configuration.

Each page's Markdown frontmatter `title` controls its browser tab label:
`title: Work` produces `Work · blastbrean`. Change `name` in `src/site.ts` to
change that shared suffix. For a completely custom tab title on one page, add:

```yaml
tabTitle: blastbrean — Backend developer
```

The visible page heading is the Markdown `# Heading`, edited separately.
Theme colors live in `src/styles/theme.css`, with distinct light and dark palettes.
The dark values are repeated in the system-preference fallback; update both blocks
when adjusting them.

Typography uses Arial with Helvetica and system sans-serif fallbacks for all text.
Font families are set in `src/styles/theme.css`; no web fonts are loaded.

## Add a personal photo or artwork

The layout uses a centered reading column with left-aligned text. A personal image
can go in `src/pages/index.md` after your introduction or near the bottom of Home.
Put the image file in `public/media/`, then add this HTML to the Markdown page,
replacing the filename, alt text, and caption with your own:

```html
<figure>
  <img src="/media/city-at-night.webp"
       alt="Describe what is visible in your photograph."
       width="1600" height="1067" />
  <figcaption>Write a short note about the place, moment, or why you chose it.</figcaption>
</figure>
```

Use the image's actual pixel width and height; the page scales it to fit and
preserves its proportions. Export a compressed WebP or JPEG rather than a
full-size camera original. For images farther down the page, add `loading="lazy"`.
Credit and link the artist in the caption when using someone else's artwork with
permission. The image and caption adapt to both themes and narrow screens.

## Add a work sample

1. Copy `docs/work-template.md` to `src/work/your-project.md`.
2. Add screenshots, videos, and optional WebVTT captions to `public/media/`.
3. Edit the title and optional fields. `/media/demo.mp4` refers to
   `public/media/demo.mp4`. Remove fields you don't need.
4. Write your explanation below the frontmatter. The card supplies its title,
   so start any subsections at `###`.
5. Set `draft: false` to show the entry on `/work/`.

Entries sort by `order`, then title. They support an image, a video with controls,
an optional poster and English captions, Markdown content, and a source code link.
Include useful image alt text and captions for videos with speech. Videos do not
autoplay. External HTTPS media URLs also work; large videos can live elsewhere.
Draft entries are omitted from the built page, but files in `public/` are always
copied to the build, so only put public assets there.

## Headless visual review

For repeatable local screenshots without controlling your desktop browser:

```sh
pnpm browser:install
pnpm check:visual
```

The check builds the site, launches headless Chromium, and captures all pages in
both themes at mobile, tablet, desktop, and TV viewport sizes. It checks page
overflow, navigation, theme control placement, and theme switching. Screenshots are
written to `.preview/` (ignored by Git). After a palette or layout change, rerun
`pnpm check:visual` and inspect the new images. No live server or deployment is
needed; the check starts and stops its own temporary local server.

## Production build

```sh
pnpm build
pnpm preview
```

Static output is written to `dist/`. Commit `pnpm-lock.yaml`; ignore `node_modules/`,
`.astro/`, and `dist/`. A future CI installation can use
`pnpm install --frozen-lockfile` with a pinned pnpm version.

## Publish with GitHub Pages

The repository is `Blastbrean/portfolio-site`. `.github/workflows/deploy.yml`
builds and deploys on a push to `main`, on a manual run, and daily at 00:17 in
America/Los_Angeles. The daily rebuild recalculates age from a private secret.
These files are local until you commit and push them; no remote settings or DNS
have been changed by this setup.

1. In the repository's **Settings → Secrets and variables → Actions**, create a
   **repository secret** named `PRIVATE_BIRTH_DATE`, with your date in `YYYY-MM-DD`
   format. Enter it directly on GitHub. Do not put it in repository files or chat.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. In the same Pages settings, set **Custom domain** to `blastbrean.com` and save.
   The Astro config uses this domain and root paths; configure it before relying
   on the temporary `github.io/portfolio-site/` URL.
4. At your DNS provider, point `blastbrean.com` at GitHub Pages. Use an
   `ALIAS`/`ANAME` for `@` pointing to `Blastbrean.github.io`, or these four `A`
   records for `@`:

   ```text
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

   For `www`, use a `CNAME` pointing to `Blastbrean.github.io`. Check existing DNS
   records before replacing any. Once GitHub's DNS check passes and its certificate
   is ready, enable **Enforce HTTPS** in Pages settings. With Actions publishing,
   no `CNAME` file in the source tree is needed.
5. Commit the source, workflow, catalog, and local images, then push `main`.
   Follow the **Deploy portfolio** workflow in the Actions tab. Use **Run workflow**
   to publish manually. Future pushes publish subsequent work samples too.

The workflow pins Node 24 and pnpm 12.15.0. It checks the build output for the birth
date before uploading the site. Only the generated `dist/` site is published.
A missing birth-date secret fails deployment with a message that does not reveal
its value. Your real date is never needed in Markdown or client JavaScript.

GitHub's scheduled workflows are best effort and can be delayed. In public repos,
GitHub disables schedules after 60 days without repository activity; re-enable the
workflow in Actions if this happens. The age updates on the next successful
scheduled, manual, or push deployment. No always-on backend is required.

References: [Astro Pages deployment](https://docs.astro.build/en/guides/deploy/github/),
[GitHub custom-domain DNS](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site),
[GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Personal background

All selected images repeat in a grid tilted 45 degrees and drift down and right.
Light mode uses a cream overlay strongest behind the reading column, with the
album artwork subtly visible at the edges. Dark mode keeps the charcoal overlay.
The browser shuffles every discovered album from all listed artists when a tab
loads, then bakes the blur into a small repeating texture. Every album appears
once in the tile before any duplicates fill its remaining cells or the tile repeats.
Only that texture moves; there is no live full-screen SVG or blur filter. On a
refresh, the plain theme background remains visible until all artwork has settled,
then the completed grid fades in. No placeholder artwork is shown. The background, its position, and pause state
persist across Home, Work, Projects, and Contact navigation. Page content fades
between routes without reloading the document. A new tab or refresh shuffles the
full collection again. Cached local artwork keeps music services off the visitor's
loading path.

Use **Space** or the pause/resume button to toggle movement. Space keeps its usual
behavior in form fields, links, buttons, and media controls. Reduced motion starts
paused; hidden tabs pause automatically.

### Choose artists

Edit `src/data/music-artists.json`, for example:

```json
["Daniel Caesar", "J. Cole", "Kendrick Lamar", "Brent Faiyaz"]
```

Album discovery runs automatically with `pnpm dev`, `pnpm build`, and
`pnpm check:visual`. Existing artist catalogs are cached for seven days; newly
added names are looked up automatically. To force a refresh at any time:

```sh
pnpm sync:music
```

The command looks up each exact artist in Apple's music catalog, downloads small
album thumbnails to `public/media/music/`, and writes `src/data/music-catalog.json`.
It omits singles with fewer than five tracks, deduplicates editions, and caches the available album results for each artist. Existing artwork is reused; a failed lookup keeps that
artist's previous catalog. Commit the generated catalog and images with the artist
list. Automatic refresh failures reuse existing catalogs so an offline build can still
work. No API key is required.

To include personal city, car, or music photos, put compressed JPEGs or WebPs in
`public/media/` and add their paths to `backgroundImages` in `src/site.ts`.
These join the random albums in the repeating tile. Original album artwork
sources are recorded in `docs/album-artwork-sources.json`; fetched album links are
kept in the music catalog.

## Private age display

Home uses `{{age}}` inside the introduction. `ageFallback: 17` in its frontmatter
preserves your supplied age when no private date is configured locally. The
production workflow requires the real private secret so the age can update.

For local development, set `PRIVATE_BIRTH_DATE` in the Git-ignored `.env` file in
`YYYY-MM-DD` format; `.env.example` shows the key. For publishing, add it as a
GitHub Actions repository secret using the steps above. Never use a `PUBLIC_`
variable or put the date in Markdown.

Astro reads the secret only during page rendering at build time. Only the computed
integer is rendered into HTML; neither the date nor a client-side age calculation
is shipped. Age uses America/Los_Angeles (February 29 birthdays advance on March 1
in non-leap years). The daily deployment rebuilds this static value. Observers can
infer a birthday by monitoring when the displayed age changes.
