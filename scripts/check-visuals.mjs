import { chromium, webkit } from 'playwright';
import { checkAccessibility } from './check-accessibility.mjs';
import { checkGallery } from './check-gallery.mjs';
import { checkTimeline } from './check-timeline.mjs';
import { checkNavigation } from './check-navigation.mjs';
import { checkBackgroundControls } from './check-background-controls.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

// Serve the production build on an ephemeral loopback port; no deployment needed.
const root = resolve('dist');
const output = resolve('.preview');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
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
  const engine = process.argv.includes('--webkit') ? webkit : chromium;
  const engineName = engine === webkit ? 'webkit' : 'chromium';
  browser = await engine.launch({ headless: true });
  const crawler = await browser.newContext({ javaScriptEnabled: false, userAgent: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' });
  const crawlerPage = await crawler.newPage();
  for (const route of ['/', '/work/', '/projects/', '/contact/']) {
    await crawlerPage.goto(origin + route);
    for (const property of ['og:title', 'og:description', 'og:url', 'og:image']) {
      assert.ok(await crawlerPage.locator(`meta[property="${property}"]`).getAttribute('content'), `Missing ${property} on ${route}`);
    }
    const image = new URL(await crawlerPage.locator('meta[property="og:image"]').getAttribute('content'));
    assert.equal(image.origin, 'https://blastbrean.com');
    const response = await crawler.request.get(origin + image.pathname);
    assert.equal(response.status(), 200);
    assert.ok(response.headers()['content-type'].startsWith('image/jpeg'));
    assert.ok((await response.body()).length > 1000);
  }
  await crawler.close();
  console.log(`${engineName}: Discord metadata and preview image passed without JavaScript.`);
  if (process.argv.includes('--accessibility')) {
    await checkAccessibility(browser, origin);
  } else {
  await checkBackgroundControls(browser, origin, engineName);
  await checkTimeline(browser, origin, engineName);
  await checkGallery(browser, origin, engineName);
  if (process.argv.includes('--navigation')) {
    await checkNavigation(browser, origin, output, engineName);
  } else {
  const sizes = { mobile: [320, 800], tablet: [768, 1024], desktop: [1440, 1000], tv: [3840, 2160] };
  let checks = 0;
  for (const theme of ['light', 'dark']) {
    for (const [name, [width, height]] of Object.entries(sizes)) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of ['/', '/work/', '/projects/', '/contact/']) {
        const response = await page.goto(origin + route);
        assert.equal(response.status(), 200);
        await page.locator('#theme').waitFor({ state: 'visible' });
        await page.locator('.personal-background[data-ready="true"]').waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('body').evaluate(element => getComputedStyle(element).fontFamily), 'Arial, Helvetica, sans-serif');
        assert.equal(await page.locator('#theme').inputValue(), 'system');
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${theme} ${route}: overflow`);
        const header = await page.locator('header').boundingBox();
        const main = await page.locator('main').boundingBox();
        const themeControl = await page.locator('.theme-control').boundingBox();
        assert.ok(header.y + header.height <= main.y + 1);
        assert.ok(themeControl.y >= header.y && themeControl.y + themeControl.height <= header.y + header.height);
        assert.deepEqual(await page.locator('nav a').allTextContents(), ['Home', 'Work', 'Projects', 'Contact']);
        assert.equal(await page.locator('nav a[aria-current="page"]').getAttribute('href'), route);
        if (route === '/projects/') {
          assert.equal(await page.getByRole('link', { name: 'Forgejo', exact: true }).getAttribute('href'), 'https://git.blastbrean.com');
          assert.equal(await page.getByRole('link', { name: 'GitHub', exact: true }).getAttribute('href'), 'https://github.com/Blastbrean');
        }
        const label = route === '/' ? 'home' : route.replaceAll('/', '');
        await page.screenshot({ path: `${output}/${name}-${theme}-${label}.png`, fullPage: false, animations: 'disabled' });
        await page.evaluate(() => document.documentElement.style.fontSize = '200%');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${theme} ${route}: enlarged text overflow`);
        await page.screenshot({ path: `${output}/${name}-${theme}-${label}-enlarged.png`, fullPage: false, animations: 'disabled' });
        await page.evaluate(() => document.documentElement.style.removeProperty('font-size'));
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
  let intermediateChecks = 0;
  const intermediateContext = await browser.newContext({ reducedMotion: 'reduce' });
  const intermediatePage = await intermediateContext.newPage();
  for (const colorScheme of ['light', 'dark']) {
    await intermediatePage.emulateMedia({ colorScheme });
    for (const [width, height] of [[390, 844], [600, 900], [844, 390], [1024, 768], [1920, 1080]]) {
      await intermediatePage.setViewportSize({ width, height });
      for (const route of ['/', '/work/', '/projects/', '/contact/']) {
        await intermediatePage.goto(origin + route);
        await intermediatePage.locator('#theme').waitFor({ state: 'visible' });
        assert.ok(await intermediatePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}×${height} ${colorScheme} ${route}: overflow`);
        intermediateChecks++;
      }
    }
  }
  await intermediateContext.close();
  const loadingContext = await browser.newContext({ reducedMotion: 'reduce' });
  const loadingPage = await loadingContext.newPage();
  let releaseArtwork;
  const artworkGate = new Promise(resolve => { releaseArtwork = resolve; });
  await loadingPage.route('**/media/music/**', async route => { await artworkGate; await route.continue(); });
  await loadingPage.goto(origin, { waitUntil: 'domcontentloaded' });
  await loadingPage.locator('#background-toggle').waitFor();
  assert.equal(await loadingPage.locator('.background-tilt').evaluate(element => getComputedStyle(element).opacity), '0');
  assert.equal(await loadingPage.locator('.background-grid').evaluate(element => getComputedStyle(element).backgroundImage), 'none');
  releaseArtwork();
  await loadingPage.locator('.personal-background[data-ready="true"]').waitFor();
  assert.equal(await loadingPage.locator('.background-tilt').evaluate(element => getComputedStyle(element).opacity), '1');
  await loadingContext.close();
  await checkNavigation(browser, origin, output, engineName);
  console.log(`Passed ${checks} page/theme/viewport checks plus ${intermediateChecks} intermediate/landscape layout checks, saved theme overrides, live system changes, diagonal grid movement, Space shortcut, reduced motion, and uninterrupted background navigation. Screenshots: ${output}`);
  }
  }
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
