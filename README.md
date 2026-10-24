# blastbrean.com

A static Astro portfolio. Content is Markdown; layouts handle presentation.
No deployment is enabled.

The theme follows the visitor's system setting by default. The footer's Theme
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
| Hiring, contact, freelancing, timezone, availability | `src/pages/contact.md` |
| Work gallery introduction | `src/pages/work.md` |

Public projects links directly to https://git.blastbrean.com from the navigation;
there is no separate project listing on this site.

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

Typography pairs self-hosted Bricolage Grotesque headings with Public Sans body text and
navigation. Font families are set in `src/styles/theme.css`, with their package
imports in `src/layouts/Page.astro`. No external font service is requested by visitors.

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
overflow, navigation, footer placement, and theme switching. Screenshots are
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

## Future production setup

`astro.config.mjs` sets `site: 'https://blastbrean.com'` with the root base path.
This sets canonical URLs; it does not publish the site or change DNS.

When ready, configure GitHub Pages and its custom domain, then add an Astro
GitHub Actions deployment workflow using Node 24 and pnpm. There is no active
deployment workflow or CNAME file in this starter.

Guide: https://docs.astro.build/en/guides/deploy/github/
