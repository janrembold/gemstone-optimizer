import { parseASC } from '../../js/export/gemcadAsc.js';
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
for (const offline of [false, true])
  test(`Leo JR pavilion-aligned family and export (${offline ? 'offline' : 'HTTP'})`, async ({
    page,
    context,
  }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    if (offline) await context.setOffline(true);
    await page.goto(offline ? pathToFileURL(resolve('index.html')).href : '/');
    await page.locator('#cut').selectOption('leo-jr');
    await expect(page.locator('#cut-note')).toContainText('20 Rundistenfacetten');
    await expect(page.locator('#stone-data')).toContainText('76 (56 + 20)');
    await expect(page.locator('#gear')).toHaveValue('80');
    for (const key of ['pavilionBase', 'pavilionMiddle', 'pavilionTip'])
      await expect(page.locator(`[data-key=${key}][data-field=min]`)).toHaveCount(1);
    await expect(page.locator('[data-key=pavilionScale]')).toHaveCount(0);
    if (!offline) {
      for (const view of ['pavilion', 'side']) {
        await page.locator(`[data-view=${view}]`).click();
        await page
          .locator('#viewer')
          .screenshot({ path: `test-results/leo-jr-three-tier-${view}.png` });
      }
      await page.locator('[data-view=perspective]').click();
    }
    await page.locator('#start').click();
    await expect(page.locator('#status')).toHaveText('VERIFIZIERT', { timeout: 150000 });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#export-selected').click(),
    ]);
    const asc = readFileSync(await download.path(), 'utf8');
    expect(parseASC(asc).facets.every((f) => Number.isInteger(f.index))).toBe(true);
    expect(parseASC(asc).facets.filter((f) => f.region === 'girdle')).toHaveLength(20);
    await expect(page.locator('#stone-data')).toContainText('76 (56 + 20)');
    const pavilionLines = asc.split(/\r?\n/).filter((l) => /^a -/.test(l) && !/^a -90\./.test(l));
    expect(pavilionLines).toHaveLength(3);
    expect(pavilionLines.map((l) => l.split(/\s+/)[5])).toEqual(['P1', 'P2', 'P3']);
    expect(asc).toContain('y 5 n');
    expect(asc).toContain('IMAGE-FIT approximate geometry');
    await page.screenshot({
      path: `test-results/leo-jr-${offline ? 'offline' : 'http'}.png`,
      fullPage: true,
    });
    await page.locator('#cut').selectOption('round-brilliant');
    await expect(page.locator('#gear')).toHaveValue('96');
    expect(errors).toEqual([]);
  });
