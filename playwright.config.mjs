// Screenshot-Vergleich vor dem Deploy (tests/visual): wichtige Seiten in allen drei Sprachen, Desktop und Handy,
// werden mit Referenzbildern verglichen – verrutschte Layouts fallen so vor dem Livegang auf.
// Referenzbilder neu aufnehmen (nach gewollten Änderungen): GitHub → Actions → „Screenshots aktualisieren“.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/visual',
  // ohne Plattform-Zusatz: Referenzbilder entstehen immer auf dem Ubuntu-Runner von GitHub
  snapshotPathTemplate: '{testDir}/referenz/{arg}{ext}',
  fullyParallel: true,
  reporter: [['list'], ['html', { outputFolder: 'screenshot-bericht', open: 'never' }]],
  outputDir: 'screenshot-ergebnisse',
  expect: {
    toHaveScreenshot: {
      // kleine Textänderungen (z. B. gegengelesene Übersetzungen) sollen nicht stören, verrutschte Bereiche schon
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  use: { baseURL: 'http://127.0.0.1:4173', serviceWorkers: 'block', locale: 'de-DE', timezoneId: 'Europe/Berlin' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'handy', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'node scripts/serve-dist.mjs 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
});
