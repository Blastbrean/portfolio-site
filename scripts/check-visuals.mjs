import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

// Serve the production build on an ephemeral loopback port; no deployment needed.
const root = resolve('dist');
const output = resolve('.preview');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
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
        await page.screenshot({ path: `${output}/${name}-${theme}-${label}.png`, fullPage: true, animations: 'disabled' });
        await page.evaluate(() => document.documentElement.style.fontSize = '200%');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${theme} ${route}: enlarged text overflow`);
        await page.screenshot({ path: `${output}/${name}-${theme}-${label}-enlarged.png`, fullPage: true, animations: 'disabled' });
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
  const motionContext = await browser.newContext({ reducedMotion: 'reduce' });
  const motionPage = await motionContext.newPage();
  await motionPage.goto(origin);
  const background = motionPage.locator('.personal-background');
  const grid = motionPage.locator('.background-grid');
  await motionPage.getByRole('button', { name: 'Resume background' }).waitFor();
  assert.equal(await background.getAttribute('data-paused'), 'true');
  assert.equal(await grid.evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
  await motionPage.locator('.personal-background[data-ready="true"]').waitFor();
  assert.equal(await motionPage.locator('svg').count(), 0);
  assert.equal(await background.evaluate(element => getComputedStyle(element).viewTransitionName), 'none');
  assert.equal(await grid.evaluate(element => getComputedStyle(element).filter), 'none');
  const selection = await background.evaluate(element => JSON.parse(element.dataset.selection));
  assert.equal(new Set(selection).size, selection.length);
  assert.equal(Number(await background.getAttribute('data-loaded-count')), selection.length);
  const available = await background.evaluate(element => JSON.parse(element.dataset.catalog).flatMap(artist => artist.albums.map(album => album.image)));
  assert.deepEqual([...selection].sort(), [...new Set(available)].sort());
  await motionPage.getByRole('button', { name: 'Resume background' }).click();
  assert.equal(await grid.evaluate(element => getComputedStyle(element).animationPlayState), 'running');
  // Seek the real CSS animation to compare motion and the exact loop boundary.
  const motion = await grid.evaluate(element => {
    const animation = element.getAnimations()[0];
    animation.pause();
    const sample = time => {
      animation.currentTime = time;
      const local = new DOMMatrix(getComputedStyle(element).transform);
      const tilt = new DOMMatrix(getComputedStyle(element.parentElement).transform);
      return { x: local.m41 * tilt.a, y: local.m41 * tilt.b };
    };
    const duration = Number(animation.effect.getTiming().duration);
    return { start: sample(0), halfway: sample(duration / 2), end: sample(duration) };
  });
  assert.ok(motion.halfway.x > motion.start.x && motion.halfway.y > motion.start.y);
  assert.ok(Math.abs(motion.halfway.x - motion.halfway.y) < 0.01);
  assert.ok(Math.abs(motion.end.x - motion.start.x) < 0.01);
  await motionPage.getByRole('button', { name: 'Pause background' }).click();
  assert.equal(await background.getAttribute('data-paused'), 'true');
  await motionPage.locator('body').click({ position: { x: 5, y: 5 } });
  await motionPage.keyboard.press('Space');
  assert.equal(await background.getAttribute('data-paused'), 'false');
  await motionPage.keyboard.press('Space');
  assert.equal(await background.getAttribute('data-paused'), 'true');
  await motionPage.locator('#theme').focus();
  await motionPage.keyboard.press('Space');
  assert.equal(await background.getAttribute('data-paused'), 'true');
  await motionPage.keyboard.press('Escape');
  await motionPage.getByRole('button', { name: 'Resume background' }).click();
  await grid.evaluate(element => {
    const animation = element.getAnimations()[0];
    animation.currentTime = 20000;
    animation.play();
    window.savedBackground = element.parentElement.parentElement;
    window.savedTexture = element.style.backgroundImage;
    window.savedDocument = document;
  });
  await motionPage.locator('#theme').selectOption('dark');
  await motionPage.getByRole('link', { name: 'Work', exact: true }).click();
  await motionPage.waitForURL('**/work/');
  await motionPage.getByRole('heading', { name: 'Work', exact: true }).waitFor();
  assert.ok(await motionPage.evaluate(() => window.savedDocument === document));
  assert.ok(await motionPage.evaluate(() => window.savedBackground === document.querySelector('.personal-background')));
  assert.ok(await grid.evaluate(element => element.style.backgroundImage === window.savedTexture));
  assert.ok(await grid.evaluate(element => Number(element.getAnimations()[0].currentTime) >= 20000));
  assert.equal(await motionPage.locator('html').getAttribute('data-theme'), 'dark');
  await motionPage.getByRole('button', { name: 'Pause background' }).click();
  assert.equal(await background.getAttribute('data-paused'), 'true');
  await motionContext.close();
  console.log(`Passed ${checks} page/theme/viewport checks, saved theme overrides, live system changes, diagonal grid movement, seamless looping, Space shortcut, reduced motion, and uninterrupted background navigation. Screenshots: ${output}`);
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
