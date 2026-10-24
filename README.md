# blastbrean.com

The code was entirely made by GPT 6.1 Sol Medium.

It came up with the idea to use Github Pages and Astro after narrowing down my requirements where I wanted something free under my domain and hosted.

First, I came up with the base design: minimalistic and clean. I didn't want to have to make something so animated and colorful or artistic, I think it makes me look more of a frontend person. Also, I'm just not experienced at that type of thing.

Next, I knew I was going to not make any of the design. I told it to create me Markdown files that I was familiar with so I could write all the content. I still think AI produces horrible looking unmaintainable code and yaps in writing, just me personally.

Finally, it was looking a bit boring and there was a lot of space. Center the page, and then I had to think of a way to personalize it. I decided to come up with a background with music albums by music artists that I like to fill the space. There we are, today.

## Link previews

Discord and other link previews read static Open Graph metadata from each page.
Edit `description`, `previewTitle`, `previewImage`, and `previewImageAlt` in
`src/site.ts`. `public/social-preview.jpg` is a 1200×630 share image inspired by
the album background; it contains no age or birth date. Regenerate it after
changing its text or artwork using `node scripts/generate-social-preview.mjs`
(requires the project's Playwright Chromium install). Commit the generated image.
Discord must be able to reach the page and image over HTTPS. After publishing,
use https://discord.com/developers/embeds to inspect the preview if Discord caches
an older version.


## Safari checks

Install the test browser once with `pnpm exec playwright install webkit`, then run
`pnpm check:safari`. This checks WebKit at phone, tablet, and desktop sizes in
both themes, including background movement across navigation and Back, pause,
Space, restored pages, and the theme selector. The background uses a single
pre-rendered texture moved with requestAnimationFrame and reschedules after page
swaps; there is no animation timeline to detach during Safari navigation.
