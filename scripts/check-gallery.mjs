import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';

const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const playing = page => page.locator('.gallery-preview').evaluateAll(videos => videos.filter(video => !video.paused).length);

const playViewer = async page => {
  const video = page.locator('.work-viewer[open] video').first();
  await video.evaluate(async el => { el.muted = true; try { await el.play(); } catch {} });
  await page.waitForFunction(() => {
    const dialog = document.querySelector('dialog[open]');
    const fallback = dialog?.querySelector('.viewer-fallback');
    return dialog?.querySelector('video')?.currentTime > .1 || (fallback?.complete && fallback?.naturalWidth > 0);
  });
};

export async function checkGallery(browser, origin, engine) {
  for (const colorScheme of ['light', 'dark']) for (const width of [320, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/media/work/')) requests.push(request.url()); });
    await page.goto(origin + '/work/');
    await page.locator('[data-masonry="true"]').waitFor();
    await page.locator('.personal-background[data-ready="true"]').waitFor();
    const cards = page.locator('.gallery-open');
    assert.ok(await cards.count() > 0);
    assert.equal(await page.locator('.tile-info, .sample-summary').count(), 0);
    assert.ok(await cards.first().getAttribute('aria-label')); 
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(requests.every(url => url.includes('/optimized/') && url.endsWith('.webp')), `${engine}: gallery eagerly downloaded original or animated media`);
    assert.equal(await playing(page), 0);
    const geometry = await page.locator('[data-work-card]').evaluateAll(elements => elements.map(el => {
      const rect = el.getBoundingClientRect(), image = el.querySelector('.gallery-poster');
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, ratio: image ? Number(image.getAttribute('width')) / Number(image.getAttribute('height')) : null };
    }));
    geometry.forEach((tile, i) => {
      if (tile.ratio) assert.ok(Math.abs(tile.width / tile.height - tile.ratio) < .01, `${engine}: image was cropped`);
      geometry.slice(i + 1).forEach(other => assert.ok(tile.right <= other.left + 1 || tile.left >= other.right - 1 || tile.bottom <= other.top + 1 || tile.top >= other.bottom - 1, `${engine}: masonry tiles overlap`));
    });
    // Rows should fill edge to edge, with the same 12px gaps and no holes.
    const bounds = await page.locator('.gallery').boundingBox();
    const rows = new Map();
    for (const tile of geometry) {
      const key = Math.round(tile.top);
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(tile);
    }
    for (const row of rows.values()) {
      row.sort((a, b) => a.left - b.left);
      assert.ok(Math.abs(row[0].left - bounds.x) < 1);
      assert.ok(Math.abs(row.at(-1).right - bounds.x - bounds.width) < 1);
      row.forEach((tile, i) => {
        assert.ok(Math.abs(tile.height - row[0].height) < 1);
        if (i) assert.ok(Math.abs(tile.left - row[i - 1].right - 12) < 1);
      });
    }
    await page.screenshot({ path: `.preview/gallery-${engine}-${colorScheme}-${width}.png`, fullPage: false });
    if (engine === 'chromium' && width === 320) {
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(result.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) })), []);
    }
    const first = cards.first();
    await first.focus();
    await page.keyboard.press('Enter');
    const viewer = page.locator('.work-viewer[open]');
    await viewer.waitFor({ state: 'visible' });
    assert.equal(await viewer.getByRole('button', { name: 'Close', exact: true }).evaluate(el => el === document.activeElement), true);
    const transform = await page.locator('.background-grid').getAttribute('style');
    await page.keyboard.down('d'); await page.waitForTimeout(50); await page.keyboard.up('d');
    assert.equal(await page.locator('.background-grid').getAttribute('style'), transform);
    const video = viewer.locator('video').first();
    if (await video.count()) {
      await video.scrollIntoViewIfNeeded();
      await playViewer(page);
    }
    assert.ok(await viewer.evaluate(el => el.getBoundingClientRect().width <= innerWidth));
    if (engine === 'chromium' && width === 320) {
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(result.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) })), []);
    }
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    assert.equal(await first.evaluate(el => el === document.activeElement), true);
    if (await video.count()) assert.equal(await video.getAttribute('src'), null);
    await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
    await page.waitForURL(origin + '/');
    await page.getByRole('navigation').getByRole('link', { name: 'Work', exact: true }).click();
    await page.waitForURL(origin + '/work/');
    await cards.last().click();
    await page.locator('.work-viewer[open]').getByRole('button', { name: 'Close', exact: true }).click();
    assert.deepEqual(errors, []);
    await context.close();
  }
  // Continuous loops only download when requested; only one decoder stays active.
  const context = await browser.newContext({ viewport: { width: 1440, height: 700 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const originals = [], previewRequests = [];
  page.on('request', request => {
    if (request.url().includes('/media/work/demos/')) originals.push(request.url());
    if (request.url().includes('/media/work/') && request.url().endsWith('.webm')) previewRequests.push(request.url());
  });
  await page.mouse.move(1, 1);
  await page.goto(origin + '/work/');
  await page.locator('.personal-background[data-ready="true"]').waitFor();
  const loops = page.locator('[data-work-card]:has(.gallery-preview[data-preview-source*="-preview.webm"])');
  if (await loops.count() >= 2) {
    assert.equal(await loops.nth(0).locator('.gallery-poster').evaluate(image => getComputedStyle(image).filter), 'grayscale(1)');
    await loops.nth(0).hover();
    await page.mouse.move(1, 1);
    await page.waitForTimeout(200);
    assert.equal(previewRequests.length, 0, `${engine}: a brief hover downloaded a preview`);
    await loops.nth(0).hover();
    await page.waitForFunction(() => document.querySelectorAll('[data-previewing="true"]').length === 1);
    await page.waitForFunction(() => [...document.querySelectorAll('.gallery-preview')].some(v => v.currentTime > .1 && !v.paused));
    const before = await loops.nth(0).screenshot();
    await page.waitForTimeout(180);
    assert.ok(!before.equals(await loops.nth(0).screenshot()), `${engine}: preview did not repaint`);
    await loops.nth(1).hover();
    await page.waitForFunction(() => document.querySelectorAll('[data-previewing="true"]').length === 1);
    assert.equal(await playing(page), 1);
    assert.equal(await loops.nth(1).locator('.gallery-poster').evaluate(image => getComputedStyle(image).filter), 'none');
    assert.equal(await loops.nth(0).locator('.gallery-preview').getAttribute('src'), null);
    await page.mouse.move(1, 1);
    await settle(page);
    assert.equal(await playing(page), 0);
    assert.equal(await page.locator('.gallery-preview[src]').count(), 0);
  }
  await page.locator('.gallery-open').first().hover();
  await page.waitForFunction(() => document.querySelectorAll('[data-previewing="true"]').length === 1);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => !document.querySelector('[data-work-card] .gallery-preview')?.hasAttribute('src'));
  await page.mouse.move(1, 1);
  await page.locator('main').focus();
  await page.keyboard.press('Tab');
  await page.locator('.gallery-open').first().focus();
  await page.waitForFunction(() => document.querySelectorAll('[data-previewing="true"]').length === 1);
  assert.deepEqual(originals, [], `${engine}: link prefetch downloaded original animations`);
  await context.close();
  // Touch/reduced-motion users open the viewer and use native video controls.
  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const touchPage = await touch.newPage();
  await touchPage.goto(origin + '/work/');
  await touchPage.locator('.personal-background[data-ready="true"]').waitFor();
  assert.equal(await touchPage.locator('[data-preview-toggle], .media-kind').count(), 0);
  await touchPage.locator('.gallery-open').first().tap();
  await touchPage.locator('.work-viewer[open]').waitFor();
  assert.equal(await playing(touchPage), 0);
  await playViewer(touchPage);
  await touch.close();
  const dataSaving = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await dataSaving.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: Object.assign(new EventTarget(), { saveData: true }), configurable: true }));
  const dataPage = await dataSaving.newPage();
  await dataPage.goto(origin + '/work/');
  await dataPage.locator('.personal-background[data-ready="true"]').waitFor();
  await dataPage.locator('.gallery-open').first().hover(); await settle(dataPage);
  assert.equal(await dataPage.locator('.gallery-preview[src]').count(), 0);
  await dataPage.locator('.gallery-open').first().click();
  await dataPage.locator('.work-viewer[open]').waitFor();
  await playViewer(dataPage);
  await dataSaving.close();
  // Embedded browsers may report no hover capability or reject WebM playback.
  const embedded = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await embedded.addInitScript(() => {
    const originalMatch = window.matchMedia.bind(window);
    window.matchMedia = query => query.includes('pointer: fine') || query.includes('hover: hover') ? originalMatch('(width: 0px)') : originalMatch(query);
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.matches('.gallery-preview')) return Promise.reject(new DOMException('Unsupported codec', 'NotSupportedError'));
      return originalPlay.call(this);
    };
  });
  const embeddedPage = await embedded.newPage();
  const fallbackRequests = [];
  embeddedPage.on('request', request => { if (request.url().includes('/media/work/demos/')) fallbackRequests.push(request.url()); });
  await embeddedPage.goto(origin + '/work/');
  await embeddedPage.locator('[data-masonry="true"]').waitFor();
  assert.equal(fallbackRequests.length, 0);
  const fallbackCard = embeddedPage.locator('[data-preview-image]').first();
  await fallbackCard.hover();
  await embeddedPage.waitForFunction(() => !!document.querySelector('.gallery-animation[src]'));
  assert.equal(await embeddedPage.locator('.gallery-animation[src]').count(), 1);
  assert.equal(await fallbackCard.locator('.gallery-poster').evaluate(el => getComputedStyle(el).filter), 'none');
  await embeddedPage.mouse.move(1, 1);
  await settle(embeddedPage);
  assert.equal(await embeddedPage.locator('.gallery-animation[src]').count(), 0);
  assert.equal(await fallbackCard.locator('.gallery-poster').evaluate(el => getComputedStyle(el).filter), 'grayscale(1)');
  await embedded.close();
  console.log(`${engine}: image-only packed rows, lazy media, hover/focus/touch, one active preview, offscreen cleanup, reduced motion/data saving, and accessible viewer passed.`);
}
