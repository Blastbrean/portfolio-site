import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';

export async function checkAccessibility(browser, origin) {
  let checks = 0;
  for (const colorScheme of ['light', 'dark']) for (const width of [320, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const route of ['/', '/work/', '/projects/', '/contact/']) {
      await page.goto(origin + route);
      await page.locator('.personal-background[data-ready="true"]').waitFor();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
      assert.deepEqual(results.violations.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), [], `${colorScheme} ${width} ${route}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('#background-shortcuts').uncheck();
      await page.locator('main').focus();
      const transform = await page.locator('.background-grid').getAttribute('style');
      await page.keyboard.down('d');
      await page.waitForTimeout(100);
      await page.keyboard.up('d');
      assert.equal(await page.locator('.background-grid').getAttribute('style'), transform);
      await page.reload();
      assert.equal(await page.locator('#background-shortcuts').isChecked(), false);
      await page.locator('#background-shortcuts').check();
      checks++;
    }
    await context.close();
  }
  console.log(`${checks} accessibility audits passed across all routes, both themes, mobile/desktop, and shortcut disable/persistence.`);
}
