import { patchSource } from './uebersetzungen-patch';

// Die Prüfseite ersetzt in uebersetzungen.ts nur die geprüften Einträge – Kommentare und Rest bleiben unverändert
const SOURCE = `export const UEBERSETZUNGEN: Uebersetzung[] = [
  // Bandmitglieder
  {
    de: 'Gesang & Gitarre',
    en: 'Vocals & guitar',
    nl: 'Zang & gitaar',
  },
  // Freunde
  {
    de: 'Unser Stammlokal',
    en: 'Our local',
    nl: 'Ons stamcafé',
    geprueft: { nl: true },
  },
];
`;

describe('Übersetzungen prüfen', () => {
  it('setzt geprueft und übernimmt Korrekturen, ohne andere Einträge anzufassen', () => {
    const { text, missing } = patchSource(SOURCE, {
      en: { 'Unser Stammlokal': { text: "Our regular's pub", ok: true } },
      nl: {},
    });
    expect(missing).toEqual([]);
    expect(text).toContain("    en: 'Our regular\\'s pub',\n    nl: 'Ons stamcafé',\n    geprueft: { en: true, nl: true },\n  },");
    expect(text).toContain("  {\n    de: 'Gesang & Gitarre',\n    en: 'Vocals & guitar',\n    nl: 'Zang & gitaar',\n  },");
    expect(text).toContain('  // Freunde\n');
  });

  it('kann eine Freigabe zurücknehmen und meldet unbekannte Texte', () => {
    const { text, missing } = patchSource(SOURCE, {
      en: { 'Gibt es nicht': { text: 'x', ok: true } },
      nl: { 'Unser Stammlokal': { text: 'Ons stamcafé', ok: false } },
    });
    expect(missing).toEqual(['Gibt es nicht']);
    expect(text).not.toContain('geprueft');
  });
});

