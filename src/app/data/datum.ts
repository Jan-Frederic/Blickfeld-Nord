// Gemeinsame Helfer für Datumsangaben (JJJJ-MM-TT, wie in band.service.ts) – statt derselben Einzeiler an vielen Stellen.

/** „2027-02-19“ → „19.02.2027“ (mit „/“ für Englisch, „-“ für Niederländisch) */
export const datumText = (iso: string, trenner: '.' | '/' | '-' = '.') => iso.split('-').reverse().join(trenner);

/** Monatsnamen (Deutsch), lang und kurz */
export const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/** „2027-02“ → „Februar 2027“ (kurz: „Feb 27“) */
export const monatText = (jm: string, kurz = false) =>
  kurz ? `${MONATE_KURZ[Number(jm.slice(5, 7)) - 1]} ${jm.slice(2, 4)}` : `${MONATE[Number(jm.slice(5, 7)) - 1]} ${jm.slice(0, 4)}`;

/** ganze Tage von `von` bis `bis` (beide JJJJ-MM-TT, mittags gerechnet – ohne Sommerzeit-Sprünge) */
export const tageZwischen = (von: string, bis: string) => Math.round((Date.parse(`${bis}T12:00:00Z`) - Date.parse(`${von}T12:00:00Z`)) / 864e5);
