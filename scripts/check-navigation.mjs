import assert from 'node:assert/strict';

export async function checkNavigation(browser, origin, output, engine = 'chromium') {
  let checks = 0;
  for (const colorScheme of ['light', 'dark']) {
    for (const [name, width, height] of [['small-phone', 320, 800], ['phone', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 1000]]) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin);
      await page.locator('.personal-background[data-ready="true"]').waitFor();
      const background = page.locator('.personal-background');
      const grid = page.locator('.background-grid');
      const x = () => grid.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m41);
      const still = async () => {
        const before = await x();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(await x(), before, `${engine}: paused background moved`);
      };
      const moving = async () => {
        const before = await x();
        await page.waitForFunction(previous => {
          const element = document.querySelector('.background-grid');
          return Math.abs(new DOMMatrix(getComputedStyle(element).transform).m41 - previous) > 0.1;
        }, before, { timeout: 3000, polling: 'raf' });
      };
      assert.equal(await background.getAttribute('data-paused'), 'true');
      await still();
      const selection = await background.evaluate(element => JSON.parse(element.dataset.selection));
      assert.equal(new Set(selection).size, selection.length);
      assert.equal(Number(await background.getAttribute('data-loaded-count')), selection.length);
      const available = await background.evaluate(element => JSON.parse(element.dataset.catalog).flatMap(artist => artist.albums.map(album => album.image)));
      assert.deepEqual([...selection].sort(), [...new Set(available)].sort());
      await page.getByRole('button', { name: 'Resume background' }).click();
      await moving();
      await page.evaluate(() => {
        window.savedBackground = document.querySelector('.personal-background');
        window.savedTexture = document.querySelector('.background-grid').style.backgroundImage;
        window.savedDocument = document;
      });
      await page.locator('#theme').selectOption(colorScheme === 'dark' ? 'light' : 'dark');
      const chosenTheme = colorScheme === 'dark' ? 'light' : 'dark';
      for (const [label, route] of [['Work', '/work/'], ['Projects', '/projects/'], ['Contact', '/contact/'], ['Home', '/'], ['Work', '/work/'], ['Home', '/']]) {
        const before = await x();
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: label, exact: true }).click();
        await page.waitForURL(origin + route);
        await page.locator('nav a[aria-current="page"]').waitFor();
        assert.ok(await page.evaluate(() => savedDocument === document && savedBackground === document.querySelector('.personal-background')));
        assert.ok(await grid.evaluate(element => element.style.backgroundImage === window.savedTexture));
        const distance = await background.evaluate(element => parseFloat(element.style.getPropertyValue('--period')));
        assert.ok((await x() - before + distance) % distance < 100, `${engine}: background jumped on navigation`);
        await moving();
        assert.equal(await page.locator('html').getAttribute('data-theme'), chosenTheme);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        checks++;
      }
      if (name === 'desktop' && colorScheme === 'light') {
        const beforePaint = await page.screenshot();
        const position = await x();
        await page.waitForFunction(previous => {
          const element = document.querySelector('.background-grid');
          return Math.abs(new DOMMatrix(getComputedStyle(element).transform).m41 - previous) > 6;
        }, position, { polling: 'raf', timeout: 3000 });
        assert.ok(!beforePaint.equals(await page.screenshot()), `${engine}: background position changed without repainting`);
      }
      await page.getByRole('button', { name: 'Pause background' }).click();
      await still();
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Contact', exact: true }).click();
      await page.waitForURL(origin + '/contact/');
      assert.equal(await background.getAttribute('data-paused'), 'true');
      await still();
      await page.locator('main').focus();
      await page.keyboard.press('Space');
      await moving();
      await page.keyboard.press('Space');
      await still();
      await page.locator('#theme').focus();
      await page.keyboard.press('Space');
      assert.equal(await background.getAttribute('data-paused'), 'true');
      await page.keyboard.press('Escape');
      const controls = await page.locator('#theme, #background-toggle').evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element);
        return { height: element.getBoundingClientRect().height, appearance: style.appearance, radius: style.borderRadius };
      }));
      assert.equal(controls[0].appearance, 'none');
      assert.ok(controls.every(control => control.height >= 40));
      await page.locator('header').screenshot({ path: `${output}/${engine}-${name}-${chosenTheme}-controls.png` });
      await page.getByRole('button', { name: 'Resume background' }).click();
      await page.goBack();
      await page.waitForURL(origin + '/');
      await moving();
      // Recover from a page restored from Safari's back/forward cache.
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
      await moving();
      if (name === 'desktop') {
        // Reproduce navigation after a hard refresh with animations enabled.
        // Earlier checks use reduced motion, which masks snapshot artifacts.
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.reload();
        await page.locator('.personal-background[data-ready="true"]').waitFor();
        await moving();
        await page.evaluate(() => {
          window.transitionResults = [];
          window.refreshBackground = document.querySelector('.personal-background');
          document.addEventListener('astro:before-swap', event => {
            event.viewTransition.ready.then(
              () => window.transitionResults.push('snapshot'),
              () => window.transitionResults.push('skipped'),
            );
          });
        });
        for (const label of ['Work', 'Home', 'Projects', 'Contact']) {
          await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click();
          await page.waitForFunction(expected => document.querySelector('nav [aria-current="page"]')?.textContent.trim() === expected, label);
          await page.waitForFunction(() => document.getAnimations().every(animation => animation.effect?.getComputedTiming().iterations === Infinity));
          assert.ok(await page.evaluate(() => refreshBackground === document.querySelector('.personal-background')));
          assert.equal(await page.locator('main').evaluate(element => getComputedStyle(element).viewTransitionName), 'none');
          assert.equal(await page.locator('html').getAttribute('data-theme'), chosenTheme);
          await moving();
        }
        assert.deepEqual(await page.evaluate(() => transitionResults), ['skipped', 'skipped', 'skipped', 'skipped']);
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
  console.log(`${engine}: ${checks} navigation checks and 8 post-refresh transitions passed with continuous motion, pause/Space, history, and consistent theme controls.`);
}
