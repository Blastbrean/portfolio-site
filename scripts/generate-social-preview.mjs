import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const catalog = JSON.parse(await readFile(new URL('../src/data/music-catalog.json', import.meta.url)));
const covers = catalog.flatMap(({ albums }) => albums.slice(0, 2));
const encoded = await Promise.all(covers.map(async ({ image }) =>
  `data:image/jpeg;base64,${(await readFile(new URL('../public' + image, import.meta.url))).toString('base64')}`));
const tiles = Array.from({ length: 64 }, (_, i) => `<img src="${encoded[i % encoded.length]}" alt="" />`).join('');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #302e2c; color: #f3ede6; font-family: Arial, Helvetica, sans-serif; }
    .covers { position: absolute; width: 1600px; height: 1600px; left: -200px; top: -485px; display: grid; grid-template-columns: repeat(8, 200px); transform: rotate(45deg); filter: blur(5px); }
    .covers img { width: 190px; height: 190px; object-fit: cover; }
    .overlay { position: absolute; inset: 0; background: rgba(48,46,44,.86); }
    main { position: absolute; inset: 0; padding: 116px 84px 64px; }
    h1 { margin: 0; font-size: 80px; line-height: 1.1; }
    p { margin: 26px 0 0; max-width: 760px; font-size: 30px; line-height: 1.5; }
    .url { position: absolute; bottom: 58px; font-size: 23px; color: #dfc0ee; }
  </style></head><body><div class="covers">${tiles}</div><div class="overlay"></div><main>
    <h1>blastbrean</h1>
    <p>Software engineer from California.<br>Games, automation, reverse engineering, and hardware.</p>
    <div class="url">blastbrean.com</div>
  </main></body></html>`);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  await page.screenshot({ path: fileURLToPath(new URL('../public/social-preview.jpg', import.meta.url)), type: 'jpeg', quality: 88 });
  console.log('Generated public/social-preview.jpg (1200 × 630).');
} finally { await browser.close(); }
