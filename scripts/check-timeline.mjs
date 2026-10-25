import assert from 'node:assert/strict';

export async function checkTimeline(browser, origin, engine) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(origin);
  await page.locator('.personal-background[data-ready="true"]').waitFor();
  const entries = page.locator('.experience-entry');
  const position = () => entries.first().evaluate(el => getComputedStyle(el, '::after').backgroundPositionY);
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const fullyFilled = async () => {
    assert.ok((await entries.evaluateAll(elements => elements.map(el => getComputedStyle(el, '::after').clipPath))).every(value => value === 'none'));
  };
  await settle();
  await fullyFilled();
  const idle = await position();
  await page.waitForTimeout(150);
  assert.equal(await position(), idle, `${engine}: gradient moved without scrolling`);
  await page.evaluate(() => scrollTo(0, 200));
  await settle();
  assert.equal(await position(), '400px', `${engine}: gradient did not follow scrolling`);
  await page.evaluate(() => scrollTo(0, 100));
  await settle();
  assert.equal(await position(), '200px');
  await fullyFilled();
  await page.getByRole('button', { name: 'Pause background', exact: true }).click();
  await settle();
  const paused = await position();
  await page.evaluate(() => scrollTo(0, 500));
  await settle();
  assert.equal(await position(), paused, `${engine}: pause did not freeze the gradient`);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settle();
  assert.equal(await position(), '0px');
  await fullyFilled();
  await context.close();
  console.log(`${engine}: fully filled timeline follows scroll directly, stays still when idle, and respects pause/reduced motion.`);
}
