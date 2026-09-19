import { test, expect } from '@playwright/test';
test('Moissanite workflow, live progress, pause/resume, full verification, geometry and ASC/JSON export', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#ri')).toHaveValue('2.65');
  await expect(page.locator('#viewer canvas')).toBeVisible();
  await expect(page.locator('#material-note')).toContainText('isotrope');
  await page.locator('#material').selectOption('diamond');
  await expect(page.locator('#ri')).toHaveValue('2.417');
  await page.locator('#material').selectOption('moissanite');
  await page.locator('#start').click();
  await expect(page.locator('#status')).toHaveText('OPTIMIZING');
  await expect(page.locator('.candidate').first()).toBeVisible();
  await page.locator('#pause').click();
  await expect(page.locator('#status')).toHaveText('PAUSIERT');
  await page.waitForTimeout(250);
  await page.locator('#pause').click();
  await expect(page.locator('#status')).toHaveText('VERIFIZIERT', { timeout: 150000 });
  await expect(page.locator('.candidate')).toHaveCount(5);
  await expect(page.locator('#optical-details')).toContainText('100.000000%');
  const initial = await page.locator('#selected-id').textContent();
  await page
    .locator('.candidate')
    .nth(2)
    .getByRole('button', { name: 'View', exact: true })
    .click();
  expect(await page.locator('#selected-id').textContent()).not.toEqual(initial);
  await page.locator('[data-view=crown]').click();
  await page.locator('#wireframe').check();
  await page.locator('#wireframe').uncheck();
  await page.locator('#transparent').check();
  await page.locator('#transparent').uncheck();
  const [asc] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#export-selected').click(),
  ]);
  expect(asc.suggestedFilename()).toMatch(/RoundBrilliant_Moissanite_.*\.asc/);
  await asc.saveAs('test-results/selected.asc');
  const [json] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#save-run').click(),
  ]);
  await json.saveAs('test-results/browser-run.json');
  await page.screenshot({ path: 'test-results/completed-desktop.png', fullPage: true });
  await page.locator('#import-file').setInputFiles('test-results/browser-run.json');
  await expect(page.locator('#run-message')).toContainText('Konfiguration geladen');
  await page.locator('#start').click();
  await expect(page.locator('#status')).toHaveText('VERIFIZIERT', { timeout: 150000 });
  await expect(page.locator('#selected-id')).toHaveText(initial);
  await page.locator('#start').click();
  await page.locator('#cancel').click();
  await expect(page.locator('#status')).toHaveText('ABGEBROCHEN');
  await expect(page.locator('#start')).toBeEnabled();
  expect(errors).toEqual([]);
});
test('Mobile layout, validation, unknown material dispersion and custom RI', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#material').selectOption('quartz');
  await expect(page.locator('#material-note')).toContainText('Keine belegte Dispersion');
  await page.locator('#ri').fill('1.6');
  await expect(page.locator('#material')).toHaveValue('other');
  await expect(page.locator('#material-note')).toContainText('Eigener RI');
  await page.locator('#advanced summary').click();
  await page.locator('#faceRays').fill('1');
  await page.locator('#start').click();
  await expect(page.locator('#status')).toHaveText('BEREIT');
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('Standard materials fill RI; Custom clears it; typing switches to Other without stale dispersion', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  for (const [id, ri] of [
    ['moissanite', '2.65'],
    ['diamond', '2.417'],
    ['sapphire', '1.768'],
  ]) {
    await page.locator('#material').selectOption(id);
    await expect(page.locator('#ri')).toHaveValue(ri);
  }
  await page.locator('#material').selectOption('custom');
  await expect(page.locator('#ri')).toHaveValue('');
  await page.locator('#start').click();
  await expect(page.locator('#status')).toHaveText('BEREIT');
  await page.locator('#ri').fill('1.9');
  await expect(page.locator('#material')).toHaveValue('other');
  await expect(page.locator('#ri')).toHaveValue('1.9');
  await expect(page.locator('#material-note')).toContainText('Keine belegte Dispersion');
  await page.locator('#material').selectOption('moissanite');
  await page.locator('#ri').fill('2.65');
  await expect(page.locator('#material')).toHaveValue('other');
  await page.locator('#start').click();
  await expect(page.locator('#status')).toHaveText('VERIFIZIERT', { timeout: 150000 });
  await expect(page.locator('#stone-data')).toContainText('Other');
  await expect(page.locator('#optical-details')).toContainText('Dispersion fehlt');
  const [json] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#save-run').click(),
  ]);
  await json.saveAs('test-results/custom-run.json');
  await page.locator('#material').selectOption('diamond');
  await page.locator('#import-file').setInputFiles('test-results/custom-run.json');
  await expect(page.locator('#material')).toHaveValue('other');
  await expect(page.locator('#ri')).toHaveValue('2.65');
  expect(errors).toEqual([]);
});
