import { parseASC } from '../../js/export/gemcadAsc.js';
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
for (const offline of [false, true])
  test(`Leonardo image-fit family and export (${offline ? 'offline' : 'HTTP'})`, async ({
    page,
    context,
  }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    if (offline) await context.setOffline(true);
    await page.goto(offline ? pathToFileURL(resolve('index.html')).href : '/');
    await page.locator('#cut').selectOption('leonardo');
    await expect(page.locator('#cut-note')).toContainText('Bildentwurf');
    await expect(page.locator('#stone-data')).toContainText('136 (56 + 80)');
    await expect(page.locator('#gear')).toHaveValue('80');
    await page.locator('#start').click();
    await expect(page.locator('#status')).toHaveText('VERIFIZIERT', { timeout: 150000 });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#export-selected').click(),
    ]);
    const asc = readFileSync(await download.path(), 'utf8');
    expect(parseASC(asc).facets.every((f) => Number.isInteger(f.index))).toBe(true);
    expect(asc).toContain('y 5 n');
    expect(asc).toContain('IMAGE-FIT approximate geometry');
    await page.screenshot({
      path: `test-results/leonardo-${offline ? 'offline' : 'http'}.png`,
      fullPage: true,
    });
    await page.locator('#cut').selectOption('round-brilliant');
    await expect(page.locator('#gear')).toHaveValue('96');
    expect(errors).toEqual([]);
  });
