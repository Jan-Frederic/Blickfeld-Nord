// Stimmen von Veranstaltern – erscheinen im Booking und im Pressekit, sobald hier mindestens ein Eintrag steht.
// Nur echte, freigegebene Zitate eintragen (Aufgabe „stimmen-veranstalter“): Wortlaut wie freigegeben, Name so, wie er
// erscheinen darf. Bei privaten Feiern ohne Namen der Gastgeber (z. B. „Gastgeberin einer Geburtstagsfeier“).
// Zitate bleiben in ihrer Sprache – auf der englischen und niederländischen Seite steht der deutsche Wortlaut.
export interface Stimme {
  /** Zitat im Wortlaut */
  zitat: string;
  /** wer – so, wie es freigegeben ist, z. B. „Café Lotti, Dingden“ */
  wer: string;
  /** Anlass oder Jahr, optional, z. B. „Tanz in den Mai 2026“ */
  anlass?: string;
}

export const STIMMEN: Stimme[] = [];
