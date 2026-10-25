# Work samples

Add a Markdown file in `src/work/`. One file makes one gallery tile. Put media in `public/media/work/`.

```yaml
---
title: "Movement test"
summary: "What this shows."
draft: false
order: 1
image: /media/work/my-capture.webp
imageAlt: "Describe the capture."
previewMode: hover
repository: https://github.com/Blastbrean/my-project
---
```

The grid shows only images, packed into rows without cropping. Titles and descriptions appear in the viewer.

Write the longer description below the second `---`. It appears when someone opens the tile.

`image` accepts still images, animated WebP, or GIF. The build makes responsive still WebP thumbnails and converts animations into video. It keeps the aspect ratio. No animated original loads in the grid.

Preview options:

- `previewMode: hover` — play on hover or keyboard focus. This is the default.
- `previewMode: manual` — open the sample to play it.
- `previewMode: none` — no preview. The sample still opens normally.

Idle thumbnails are grayscale. Hover or keyboard focus restores color and plays the preview. Reduced motion, data saving, and Pause background disable automatic playback. On phones, tap the image to open the viewer and use its video controls. Only one grid preview plays at a time. If the browser cannot play the converted video, it loads the original animation on hover and unloads it on leave.

For an existing video:

```yaml
video: /media/work/demo.webm
videoPoster: /media/work/poster.webp
videoCaptions: /media/work/captions.vtt
preview: /media/work/short-preview.webm
```

`preview` is optional. Use a short, muted WebM or MP4 loop when the main video is large. `video` is the full recording in the viewer. `videoCaptions` is a WebVTT file. Include a description or transcript in the Markdown when needed.

The preview conversion runs automatically with `pnpm dev` and `pnpm build`. If dev is already running, run `pnpm prepare:work` after adding or changing media. Unchanged files are cached. Commit the generated `src/data/work-media.json` and `public/media/work/optimized/` files with your samples. The optimized directory is generated; keep originals outside it.

If an animation needs converting and no encoder is installed, the script installs Playwright's small FFmpeg encoder. No bot token or external media service is used.

Set `draft: true` to hide a tile. Lower `order` numbers appear first. The demo files can be edited or removed.
