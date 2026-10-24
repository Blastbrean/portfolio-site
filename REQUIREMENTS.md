# Portfolio requirements

- Content is written by the owner in Markdown. Preserve their wording unless
  editing is explicitly requested; do not invent professional or personal claims.
- Home covers what the owner does and their experience.
- Contact covers contact methods, freelance rules, timezone, and availability.
- Work showcases the owner's images, videos, and descriptions.
- Navigation order is Home, Work, Projects, Contact.
- Projects links to Forgejo at https://git.blastbrean.com and GitHub at
  https://github.com/Blastbrean.
- Use standard system fonts, explicit labels, and no decorative top bar.
- Keep the theme selector near the top alongside navigation.
- Use a narrow, centered reading column with left-aligned text and space above it.
- Personal imagery repeats in a blurred grid tilted 45 degrees, continuously
  scrolling down and right with no visible captions.
  Keep text readable in both themes, provide pause/resume (including Space outside
  interactive controls), and respect reduced motion. Preserve background position
  and pause state during page navigation. Use a small pre-rendered texture, with
  no live SVG or full-screen blur. Random album choices come from locally cached
  catalogs for an editable artist list; do not fetch music APIs on page load.
- The production origin is https://blastbrean.com. GitHub Pages publishing is
  configured for pushes, manual runs, and a daily age rebuild. Activating remote
  Pages settings, the private birth-date secret, and DNS is a separate setup step.
- Birth date stays in a private build secret. Publish only the computed age and
  reject output containing the private date before uploading deployment artifacts.

## Responsive scaling — required for all future changes

The entire site must be easy to view and navigate from mobile through tablet,
desktop, and TV displays. Support intermediate sizes, not just named devices.

- No page-wide horizontal overflow at narrow widths (including 320 CSS pixels).
  Code blocks may scroll within their own bounds.
- Navigation and controls wrap without clipping, overlap, or hover-only access.
- Text remains readable with bounded line lengths, browser zoom, and enlarged text.
- Images and video fit their containers and preserve their aspect ratios.
- Large desktop and TV layouts retain readable text and restrained content widths;
  text scales up for very large viewports.
- Support touch, mouse, and keyboard navigation, with visible focus states.
- The theme selector offers System, Light, and Dark. System follows the device
  preference. Remember explicit choices and allow returning to System.
- Dark mode uses lighter warm charcoal with dusty rose and lilac accents;
  light mode uses cream, pale yellow, and blue. Keep the palettes distinct. Retain readable text, controls, links, and borders in either mode.
- When visual browser testing is available, check representative widths of 320,
  768, 1440, and 3840 CSS pixels and zoomed layouts. Report verification gaps.
- Use the project's `pnpm check:visual` command for theme and layout iterations,
  and inspect the generated `.preview/` screenshots rather than relying on build
  success alone. Headless browser previews are authorized for this project.
