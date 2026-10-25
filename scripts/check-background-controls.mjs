import assert from 'node:assert/strict';

export async function checkBackgroundControls(browser, origin, engine) {
  const context = await browser.newContext({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-10-24T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-24T12:00:00Z'));
  await page.goto(origin);
  await page.locator('.personal-background[data-ready="true"]').waitFor();
  await page.locator('main').focus();
  const position = () => page.locator('.background-grid').evaluate(el => {
    const matrix = new DOMMatrix(getComputedStyle(el).transform);
    return { x: matrix.m41, y: matrix.m42 };
  });
  const rotation = () => page.locator('.personal-background').evaluate(el => parseFloat(el.style.getPropertyValue('--rotation')));
  for (const key of ['w', 'a', 's', 'd', 'ArrowLeft', 'ArrowRight']) {
    await page.keyboard.down(key);
    await page.clock.runFor(64);
    const first = await position();
    await page.clock.runFor(64);
    const second = await position();
    await page.clock.runFor(64);
    const third = await position();
    assert.notDeepEqual(first, second, `${engine}: ${key} stalled without key repeat`);
    assert.notDeepEqual(second, third, `${engine}: ${key} stalled during hold`);
    await page.keyboard.up(key);
    const stopped = await position();
    await page.clock.runFor(64);
    assert.deepEqual(await position(), stopped, `${engine}: ${key} kept moving after release`);
  }
  for (const key of ['=', '-']) {
    await page.keyboard.down(key);
    await page.clock.runFor(64);
    const first = await rotation();
    await page.clock.runFor(64);
    assert.notEqual(await rotation(), first, `${engine}: rotation stalled without key repeat`);
    await page.keyboard.up(key);
    const stopped = await rotation();
    await page.clock.runFor(64);
    assert.equal(await rotation(), stopped);
  }
  for (const key of ['[', ']']) {
    const speed = () => page.locator('.personal-background').evaluate(el => Number(el.dataset.speed));
    const before = await speed();
    await page.keyboard.down(key);
    await page.clock.runFor(128);
    const during = await speed();
    assert.ok(key === '[' ? during < before : during > before, `${engine}: bracket speed control failed`);
    await page.keyboard.up(key);
    await page.clock.runFor(64);
    assert.equal(await speed(), during);
  }
  assert.equal(await page.locator('header #background-toggle').count(), 1);
  assert.equal(await page.locator('footer .background-options').count(), 1);
  assert.equal(await page.locator('.background-options details, .background-options summary').count(), 0);
  await page.locator('#background-speed').focus();
  await page.keyboard.press('End');
  assert.equal(await page.locator('.personal-background').getAttribute('data-speed'), '20.00');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.personal-background').getAttribute('data-speed'), '20.00');
  await page.locator('#background-speed').evaluate(input => { input.value = '1'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('main').focus();
  await page.keyboard.down('d');
  await page.clock.runFor(64);
  await page.evaluate(() => dispatchEvent(new Event('blur')));
  const stopped = await position();
  await page.clock.runFor(128);
  assert.deepEqual(await position(), stopped, `${engine}: background kept moving after losing focus`);
  await page.keyboard.up('d');
  await page.locator('#theme').focus();
  await page.keyboard.down('d');
  await page.clock.runFor(128);
  assert.deepEqual(await position(), stopped, `${engine}: keyboard controls affected a select`);
  await page.keyboard.up('d');
  await page.keyboard.press('Escape');
  await page.locator('main').focus();
  assert.equal(await page.locator('main').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  await page.locator('#theme').focus();
  assert.notEqual(await page.locator('#theme').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  await page.clock.resume();
  await page.goto(origin + '/contact/');
  const discord = page.locator('a[href="https://discord.com/users/1535312550479003660"]');
  assert.equal(await discord.textContent(), 'therealblastbrean');
  assert.match(await discord.locator('..').textContent(), /1535312550479003660/);
  assert.equal(await page.locator('a[href="mailto:business@blastbrean.com"]').count(), 1);
  for (const path of ['PT', 'PST', 'UTC-7']) assert.equal(await page.locator(`a[href="https://time.is/${path}"]`).count(), 1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  await context.close();
  console.log(`${engine}: continuous held keys, release/blur, native controls, content focus, and contact links passed.`);
}
