import sharp from 'sharp';
import gifenc from 'gifenc';
import { mkdir, writeFile } from 'node:fs/promises';
const { GIFEncoder } = gifenc;

// Solid-color stand-ins, with deliberately different shapes. Each animation
// changes only its flat color; the gallery uses a static gray first frame.
const demos = [
  { slug: 'dashboard', width: 640, height: 360, type: 'webp' },
  { slug: 'movement', width: 480, height: 640, type: 'webp' },
  { slug: 'pose', width: 360, height: 480, type: 'gif' },
  { slug: 'network', width: 480, height: 480, type: 'webp' },
  { slug: 'frames', width: 720, height: 300, type: 'webp' },
  { slug: 'terminal', width: 480, height: 360, type: 'gif' },
  { slug: 'trace', width: 400, height: 600, type: 'webp' },
];
await mkdir('public/media/work/demos', { recursive: true });
for (const [index, demo] of demos.entries()) {
  const base = Array.from({ length: 3 }, () => 80 + Math.floor(Math.random() * 130));
  const gif = GIFEncoder();
  const pixels = new Uint8Array(demo.width * demo.height);
  for (let frame = 0; frame < 24; frame++) {
    const shift = Math.sin(frame / 24 * Math.PI * 2) * 35;
    const color = base.map((value, channel) => Math.round(value + shift * (channel === 1 ? -1 : 1)));
    gif.writeFrame(pixels, demo.width, demo.height, { palette: [color, color], delay: 125, repeat: 0 });
  }
  gif.finish();
  const encoded = Buffer.from(gif.bytes());
  const file = `/media/work/demos/${demo.slug}.${demo.type}`;
  await writeFile(`public${file}`, demo.type === 'gif' ? encoded : await sharp(encoded, { animated: true }).webp({ lossless: true, loop: 0 }).toBuffer());
  if (index > 0) await writeFile(`src/work/demo-${demo.slug}.md`, `---\ntitle: "Sample ${index + 1} (placeholder)"\nsummary: "Replace this with your own work."\ndraft: false\norder: ${index + 3}\nimage: ${file}\nimageAlt: "A solid-color placeholder."\nrepository: https://github.com/octocat/Hello-World\n---\n\nThis is a placeholder. Replace it with your own image, GIF, or video.\n\nWrite about your work here. The repository link is a placeholder too.\n`);
  console.log(`Generated ${demo.slug}: ${demo.width}x${demo.height}`);
}
