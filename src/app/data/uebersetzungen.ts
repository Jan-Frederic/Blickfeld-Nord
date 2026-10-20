// Übersetzungen der Inhalte (Bios, Historie, Bildtexte, Freunde, Technik) ins Englische und Niederländische.
//
// Jeder Eintrag steht neben seinem deutschen Original. Ändert sich der deutsche Text in band.service.ts, passt
// die Übersetzung nicht mehr – die Seite zeigt dann das Original mit dem Hinweis „nur auf Deutsch“.
// Maschinell übersetzte Texte tragen auf der Seite den Hinweis „noch nicht gegengelesen“. Nach dem Gegenlesen
// geprueft: { en: true } bzw. { nl: true } setzen – dann verschwindet der Hinweis (Anleitung: PFLEGE.md).
export interface Uebersetzung {
  de: string;
  en: string;
  nl: string;
  /** von einem Menschen gegengelesen */
  geprueft?: { en?: boolean; nl?: boolean };
}

export const UEBERSETZUNGEN: Uebersetzung[] = [];
