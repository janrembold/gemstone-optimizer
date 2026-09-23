import { parseASC } from '../../js/export/gemcadAsc.js';
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('Direct index.html opens offline with materials, Blob-worker optimization and reproducible exports', async ({
  page,
  context,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.setOffline(true);
  await page.goto(pathToFileURL(resolve('index.html')).href);
  await expect(page.locator('#material option')).toHaveCount(11);
  await expect(page.locator('#ri')).toHaveValue('2.65');
  await expect(page.locator('#viewer canvas')).toBeVisible();
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).marginTop)).toBe('0px');
  await page.locator('#material').selectOption('sapphire');
  await expect(page.locator('#ri')).toHaveValue('1.768');
  await page.locator('#material').selectOption('custom');
  await expect(page.locator('#ri')).toHaveValue('');
  await page.locator('#ri').fill('1.9');
  await expect(page.locator('#material')).toHaveValue('other');
  await page.locator('#material').selectOption('moissanite');
  await page.locator('#start').click();
  await expect(page.locator('#status')).toHaveText('VERIFIZIERT', { timeout: 150000 });
  await expect(page.locator('.candidate')).toHaveCount(5);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#save-run').click(),
  ]);
  const run = JSON.parse(readFileSync(await download.path(), 'utf8'));
  const reference = JSON.parse(readFileSync('docs/example-run.json', 'utf8'));
  expect(run.results.map((r) => r.id)).toEqual(reference.results.map((r) => r.id));
  for (let i = 0; i < 5; i++) {
    expect(run.results[i].metrics.Global).toBeCloseTo(reference.results[i].metrics.Global, 9);
  }
  const [asc] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#export-selected').click(),
  ]);
  expect(readFileSync(await asc.path(), 'utf8')).toMatch(/^GemCad 5\.0/);
  expect(
    parseASC(readFileSync(await asc.path(), 'utf8')).facets.every((f) => Number.isInteger(f.index)),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/direct-file.png', fullPage: true });
  expect(errors).toEqual([]);
});
