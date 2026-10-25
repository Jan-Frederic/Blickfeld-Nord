// Screenshot-Vergleich für Navigation und Backstage: aufgeklapptes Handy-Menü (Website und Backstage), Kopfleiste im
// Backstage und die festen Teile von Übersicht und Zahlen. Nur Bereiche, die sich durch Code-Änderungen verändern –
// Termine, Konzertlisten und Kampagnen-Tabellen wachsen mit jedem Auftritt und bleiben deshalb draußen.
// GoatCounter antwortet mit einer festen Zahl, damit die Besucherzahlen immer gleich aussehen.
import { test, expect } from '@playwright/test';

const NOW = new Date('2026-10-01T10:00:00+02:00');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await page.route(/goatcounter\.com\/counter\//, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ count: '1.234' }) }),
  );
});

async function laden(page, path) {
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}

for (const [name, path] of [['website', '/'], ['website-nl', '/nl'], ['backstage', '/backstage/material']]) {
  test(`menü ${name}`, async ({ page }, info) => {
    await laden(page, path);
    await page.locator('button.mobile-nav').click();
    await expect(page.locator('#hauptmenue')).toBeVisible();
    await expect(page.locator('#hauptmenue')).toHaveScreenshot(`${info.project.name}-menue-${name}.png`);
  });
}

test('kopfleiste backstage (breit)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'volle Leiste nur ab 1366 px');
  await page.setViewportSize({ width: 1440, height: 900 });
  await laden(page, '/backstage/zahlen');
  await expect(page.locator('.topbar')).toHaveScreenshot('desktop-kopfleiste-backstage.png');
});

test('backstage übersicht – kacheln', async ({ page }, info) => {
  await laden(page, '/backstage');
  await expect(page.locator('app-backstage > .section > ul.tiles')).toHaveScreenshot(`${info.project.name}-backstage-kacheln.png`);
});

test('backstage zahlen – besucher', async ({ page }, info) => {
  await laden(page, '/backstage/zahlen');
  const b = page.locator('app-backstage-besucher');
  await b.locator('.trend').waitFor();
  await expect(b.locator('.totals').first()).toHaveScreenshot(`${info.project.name}-zahlen-summen.png`);
  await expect(b.locator('.trend')).toHaveScreenshot(`${info.project.name}-zahlen-trend.png`);
  await expect(b.locator('ol.pages').first()).toHaveScreenshot(`${info.project.name}-zahlen-seiten.png`);
  await expect(page.locator('app-bandjahr .head')).toHaveScreenshot(`${info.project.name}-zahlen-bandjahr-kopf.png`);
});
