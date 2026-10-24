// Screenshot-Vergleich: Seitenbereiche, die sich nur durch Code-Änderungen verändern, in DE/EN/NL.
// Inhalte, die sich laufend ändern (nächster Auftritt, Countdown, Konzertliste, Verfügbarkeit, Rückblicke,
// Songliste aus Spotify), werden ausgelassen oder abgedeckt – sonst würde jeder neue Termin den Deploy stoppen.
import { test, expect } from '@playwright/test';

// fester Zeitpunkt: Datumsangaben und Kalender sehen bei jedem Lauf gleich aus
const NOW = new Date('2026-10-01T10:00:00+02:00');

const PAGES = [
  // [Name, Pfad, Bereiche (Selektoren), abzudeckende Bereiche]
  ['start', '/', ['mat-toolbar', 'app-hero', 'app-band', 'footer'], ['app-next-show', 'footer .version']],
  ['booking', '/booking', ['app-booking'], ['app-availability']],
  ['technik', '/technik', ['main'], []],
  ['presse', '/presse', ['main'], []],
  ['impressum', '/impressum', ['main'], []],
  ['fehlerseite', '/gibt-es-nicht', ['main'], []],
];

for (const lang of ['de', 'en', 'nl']) {
  for (const [name, path, areas, masks] of PAGES) {
    test(`${lang} ${name}`, async ({ page }, info) => {
      await page.clock.setFixedTime(NOW);
      const url = lang === 'de' ? path : `/${lang}${path === '/' ? '' : path}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      // verzögert geladene Abschnitte und Bilder: einmal ganz nach unten scrollen
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      // Fenster so hoch wie die Seite: Bereiche, die höher als der Bildschirm sind (Handy, „Die Band“), müssen
      // sonst zum Aufnehmen gescrollt werden – dabei landeten feste Kopfleiste und Abdeckungen mitten im Bild
      // und die Aufnahme wurde nie stabil
      const size = page.viewportSize();
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: size.width, height: Math.min(height, 12000) });
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      for (const area of areas) {
        const el = page.locator(area).first();
        await expect(el).toHaveScreenshot(`${info.project.name}-${lang}-${name}-${area.replace(/[^a-z]/g, '')}.png`, {
          mask: masks.map((m) => page.locator(m)),
        });
      }
    });
  }
}
