import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

// Serve the production build on an ephemeral loopback port; no deployment needed.
const root = resolve('dist');
const output = resolve('.preview');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + sep)) throw new Error('Invalid path');
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(content);
  } catch { response.writeHead(404); response.end('Not found'); }
});
let browser;
try {
  await mkdir(output, { recursive: true });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const sizes = { mobile: [320, 800], tablet: [768, 1024], desktop: [1440, 1000], tv: [3840, 2160] };
  let checks = 0;
  for (const theme of ['light', 'dark']) {
    for (const [name, [width, height]] of Object.entries(sizes)) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of ['/', '/contact/', '/work/']) {
        const response = await page.goto(origin + route);
        assert.equal(response.status(), 200);
        await page.locator('#theme').waitFor({ state: 'visible' });
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => [...document.fonts].some(font => font.family.includes('Bricolage Grotesque') && font.status === 'loaded')), 'Heading font did not load');
        assert.ok(await page.evaluate(() => [...document.fonts].some(font => font.family.includes('Public Sans') && font.status === 'loaded')), 'Body font did not load');
        assert.equal(await page.locator('#theme').inputValue(), 'system');
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${theme} ${route}: overflow`);
        const header = await page.locator('header').boundingBox();
        const main = await page.locator('main').boundingBox();
        const footer = await page.locator('footer').boundingBox();
        assert.ok(header.y + header.height <= main.y + 1);
        assert.ok(main.y + main.height <= footer.y + 1);
        assert.equal(await page.locator('header a').count(), 4);
        const label = route === '/' ? 'home' : route.replaceAll('/', '');
        await page.screenshot({ path: `${output}/${name}-${theme}-${label}.png`, fullPage: true });
        checks++;
      }
      await page.locator('#theme').selectOption(theme === 'dark' ? 'light' : 'dark');
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme === 'dark' ? 'light' : 'dark');
      await page.locator('#theme').selectOption('system');
      await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark' });
      await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, theme === 'dark' ? 'light' : 'dark');
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
  console.log(`Passed ${checks} page/theme/viewport checks, saved theme overrides, and live system changes. Screenshots: ${output}`);
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
