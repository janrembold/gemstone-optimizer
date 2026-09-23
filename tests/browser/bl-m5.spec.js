import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseASC } from '../../js/export/gemcadAsc.js';
import { generate } from '../../js/cuts/blM5.js';
import { norm, sub } from '../../js/geometry/planes.js';
for (const offline of [false, true])
  test(`BL-M5 family, own schema, optimization and ASC/JSON roundtrip (${offline ? 'file offline' : 'HTTP'})`, async ({
    page,
    context,
  }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    if (offline) await context.setOffline(true);
    await page.goto(offline ? pathToFileURL(resolve('index.html')).href : '/');
    await page.locator('#cut').selectOption('bl-m5');
    await expect(page.locator('#cut-symmetry')).toContainText('12-fach');
    await expect(page.locator('#stone-data')).toContainText('85 (61 + 24)');
    await expect(page.locator('#stone-data')).toContainText('30.079455');
    await expect(page.locator('#viewer-cut-name')).toHaveText('BL-M5');
    await expect(page.locator('[data-key=crown2][data-field=min]')).toHaveCount(1);
    await expect(page.locator('[data-key=star]')).toHaveCount(0);
    await page.locator('#start').click();
    await expect(page.locator('#cut')).toBeDisabled();
    await expect(page.locator('#status')).toHaveText('VERIFIZIERT', { timeout: 150000 });
    await expect(page.locator('.candidate')).toHaveCount(5);
    await expect(page.locator('.candidate').first()).toContainText('BL-M5');
    const [json] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#save-run').click(),
    ]);
    const jsonPath = await json.path(),
      run = JSON.parse(readFileSync(jsonPath, 'utf8'));
    expect(run.config.cutId).toBe('bl-m5');
    expect(run.results[0].reproduction.topologyVersion).toBe('bl-m5-flat-table-1-integer-orbits-1');
    const [asc] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#export-selected').click(),
    ]);
    expect(asc.suggestedFilename()).toMatch(/^BL-M5_Moissanite_/);
    const parsed = parseASC(readFileSync(await asc.path(), 'utf8'));
    expect(parsed.facets).toHaveLength(85);
    expect(parsed.facets.every((f) => Number.isInteger(f.index))).toBe(true);
    for (const f of generate(run.results[0].parameters).facets)
      expect(
        parsed.facets.some((g) => norm(sub(f.n, g.n)) < 1e-9 && Math.abs(f.d - g.d) < 1e-9),
      ).toBe(true);
    await page.screenshot({
      path: `test-results/bl-m5-${offline ? 'offline' : 'http'}.png`,
      fullPage: true,
    });
    await page.locator('#cut').selectOption('round-brilliant');
    await expect(page.locator('.candidate')).toHaveCount(0);
    await expect(page.locator('#save-run')).toBeDisabled();
    await expect(page.locator('#stone-data')).toContainText('73 (57 + 16)');
    await page.locator('#import-file').setInputFiles(jsonPath);
    await expect(page.locator('#cut')).toHaveValue('bl-m5');
    await expect(page.locator('#run-message')).toContainText('Konfiguration geladen');
    await page.locator('#import-file').setInputFiles('docs/example-run.json');
    await expect(page.locator('#cut')).toHaveValue('round-brilliant');
    await expect(page.locator('#run-message')).toContainText('Konfiguration geladen');
    expect(errors).toEqual([]);
  });
