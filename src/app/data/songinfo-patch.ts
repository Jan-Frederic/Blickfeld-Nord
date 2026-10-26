// Übernimmt Tonart und Tempo aus Backstage → Songs in den Quelltext von songinfo.ts: ersetzt nur die Liste
// SONGINFO (eine Zeile je Song), Kommentare und alles andere bleiben zeichengenau erhalten.
// Ohne Angular-Abhängigkeiten, damit es auch in Node getestet werden kann.
import type { SongInfo } from './songinfo';

const q = (s: string) => `'${s.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** Eine Zeile im Stil der Datei: { title: '…', artist: '…', tonart: 'G', spielTonart: 'A', capo: 2, bpm: 120, notiz: '…', quelle: '…' }, */
export function songInfoZeile(s: SongInfo): string {
  const teile = [`title: ${q(s.title)}`, `artist: ${q(s.artist)}`];
  if (s.tonart) teile.push(`tonart: ${q(s.tonart)}`);
  if (s.spielTonart) teile.push(`spielTonart: ${q(s.spielTonart)}`);
  if (s.capo) teile.push(`capo: ${s.capo}`);
  if (s.bpm) teile.push(`bpm: ${s.bpm}`);
  if (s.notiz?.trim()) teile.push(`notiz: ${q(s.notiz)}`);
  if (s.quelle?.trim()) teile.push(`quelle: ${q(s.quelle)}`);
  return `  { ${teile.join(', ')} },`;
}

/** Ersetzt die Liste SONGINFO – null, wenn sie in der Datei nicht zu finden ist; leere Einträge fallen weg */
export function patchSongInfo(source: string, liste: SongInfo[]): string | null {
  const re = /(export const SONGINFO: SongInfo\[\] = \[)[\s\S]*?(\];)/;
  if (!re.test(source)) return null;
  const zeilen = liste.filter((s) => s.tonart || s.spielTonart || s.capo || s.bpm || s.notiz?.trim()).map(songInfoZeile);
  return source.replace(re, (_, start: string, end: string) => (zeilen.length ? `${start}\n${zeilen.join('\n')}\n${end}` : `${start}${end}`));
}
