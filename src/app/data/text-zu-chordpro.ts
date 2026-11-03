// Text mit „Akkorden über dem Text“ (wie auf Ultimate Guitar, Cifra Club, in Word-Dateien) in ChordPro umwandeln:
// eine Akkordzeile über einer Textzeile wird zu „[G]Einer von [D]80 Millionen“, reine Akkordzeilen (Intro, Zwischenspiel)
// zu „[G] [D] [Em]“. Dazu Metadaten: {title}/{artist} vom Song, {key} aus „Key:“/„Tonart:“/„Tom:“, {capo} aus „Capo 2“,
// Abschnitte wie „[Chorus]“, „Refrain:“, „Strophe 2“ als {comment: …} – eckige Klammern blieben sonst als Akkord stehen.
// Grundlage: ein kleines Skript (Akkordzeile erkennen, Akkorde spaltengenau in die Textzeile setzen), erweitert um
// deutsche Akkordnamen (H), mehr Akkordformen, Taktstriche und Wiederholungen. Ohne Angular, damit es in Node testbar ist.

// Grundton (auch H), Vorzeichen, Art (m, maj, dim, aug, sus, add, +, ø …), Zahlen und Zusätze (7b5, 6/9, #11), Bass
const CHORD =
  /^\(?(?:[A-H](?:#|b)?(?:maj|min|m|dim|aug|sus|add|ø|°|\+|-)?(?:\d+)?(?:(?:maj|sus|add|b|#)\d+|\/9|\d+)*(?:\/[A-H](?:#|b)?)?|N\.?C\.?)\)?$/;
// Taktstriche, Wiederholungen und Platzhalter dürfen in einer Akkordzeile stehen
const NEBEN = /^(?:\||\|\||:\||\|:|-+|\/|%|x\d+|\(x\d+\)|\d+x|\(\d+x\))$/i;
// Abschnitte, englisch und deutsch, mit oder ohne Klammern / Doppelpunkt
const ABSCHNITT =
  /^\s*[[(]?\s*((?:pre[- ]?)?chorus|refrain|vers(?:e)?|strophe|bridge|intro|outro|solo|interlude|zwischenspiel|instrumental|ende|schluss|coda|pre[- ]?refrain|hook|tag)\s*(\d*)\s*[\])]?\s*:?\s*$/i;
const DEUTSCH: Record<string, string> = { chorus: 'Refrain', 'pre-chorus': 'Pre-Refrain', 'pre chorus': 'Pre-Refrain', prechorus: 'Pre-Refrain', verse: 'Strophe', vers: 'Strophe', interlude: 'Zwischenspiel', instrumental: 'Zwischenspiel', ende: 'Schluss', coda: 'Schluss' };

const ohneKlammern = (c: string): string => c.replace(/[()]/g, '');

const tabsAufloesen = (zeile: string, breite = 4): string => {
  let out = '';
  for (const ch of zeile) out += ch === '\t' ? ' '.repeat(breite - (out.length % breite)) : ch;
  return out;
};

/** Zeile nur aus Akkorden (Taktstriche und „x2“ erlaubt, mindestens ein Akkord) */
export function istAkkordzeile(zeile: string): boolean {
  const t = zeile.trim().split(/\s+/).filter(Boolean);
  return t.some((x) => CHORD.test(x)) && t.every((x) => CHORD.test(x) || NEBEN.test(x));
}

/** schon ChordPro: Akkorde in [ ] oder Direktiven in { } */
export function istChordPro(text: string): boolean {
  // „[Chorus]“ zählt nicht – nur echte Akkorde in eckigen Klammern
  return /^\s*\{[a-z_]+\s*(?::[^}]*)?\}\s*$/im.test(text) || [...text.matchAll(/\[([^\]\s]{1,12})\]/g)].some((m) => CHORD.test(m[1]));
}

/** sieht nach „Akkorde über dem Text“ aus (mindestens zwei Akkordzeilen) */
export function istAkkordText(text: string): boolean {
  return !istChordPro(text) && text.split(/\r?\n/).filter(istAkkordzeile).length >= 2;
}

function einsetzen(akkorde: string, text: string): string {
  const stellen: [number, string][] = [];
  for (const m of akkorde.matchAll(/\S+/g)) if (CHORD.test(m[0])) stellen.push([m.index ?? 0, ohneKlammern(m[0])]);
  const ende = Math.max(0, ...stellen.map(([spalte]) => spalte));
  let out = text.padEnd(ende, ' ');
  // von rechts nach links, damit die Spalten weiter vorn stimmen
  for (const [spalte, akkord] of [...stellen].reverse()) out = out.slice(0, spalte) + `[${akkord}]` + out.slice(spalte);
  return out.trimEnd();
}

const nurAkkorde = (zeile: string): string =>
  zeile
    .trim()
    .split(/\s+/)
    .map((x) => (CHORD.test(x) ? `[${ohneKlammern(x)}]` : x))
    .join(' ');

function abschnittName(roh: string, nr: string): string {
  const k = roh.toLowerCase();
  const name = DEUTSCH[k] ?? roh.charAt(0).toUpperCase() + roh.slice(1).toLowerCase();
  return nr ? `${name} ${nr}` : name;
}

export interface Umwandlung {
  text: string;
  /** Zeilen mit Akkorden über Text, die zusammengeführt wurden */
  zusammengefuehrt: number;
  /** reine Akkordzeilen */
  akkordzeilen: number;
  abschnitte: number;
}

/**
 * „Akkorde über dem Text“ → ChordPro. meta: Titel und Interpret des Songs (stehen vorne, falls im Text keine stehen).
 */
export function textZuChordPro(text: string, meta: { title?: string; artist?: string } = {}, tabBreite = 4): Umwandlung {
  const zeilen = text.replace(/^﻿/, '').split(/\r?\n/).map((z) => tabsAufloesen(z, tabBreite));
  const kopf: string[] = [];
  const out: string[] = [];
  const u: Umwandlung = { text: '', zusammengefuehrt: 0, akkordzeilen: 0, abschnitte: 0 };
  let titel = false;
  let interpret = false;

  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i];
    const naechste = zeilen[i + 1];
    const t = zeile.trim();

    if (istAkkordzeile(zeile)) {
      if (naechste !== undefined && naechste.trim() && !istAkkordzeile(naechste) && !ABSCHNITT.test(naechste)) {
        out.push(einsetzen(zeile, naechste));
        u.zusammengefuehrt++;
        i++;
      } else {
        out.push(nurAkkorde(zeile));
        u.akkordzeilen++;
      }
      continue;
    }

    const abschnitt = ABSCHNITT.exec(t);
    if (abschnitt) {
      out.push(`{comment: ${abschnittName(abschnitt[1], abschnitt[2])}}`);
      u.abschnitte++;
      continue;
    }

    // Metadaten-Zeilen: Titel/Interpret/Tonart nur mit Doppelpunkt (sonst wäre „Band of Gold“ weg), Capo auch „Capo 2“
    const kv = /^(title|titel|artist|interpret|band|key|tonart|tom)\s*:\s*(.+)$/i.exec(t);
    if (kv) {
      const n = kv[1].toLowerCase();
      const wert = kv[2].trim();
      if (n === 'title' || n === 'titel') (kopf.push(`{title: ${wert}}`), (titel = true));
      else if (n === 'artist' || n === 'interpret' || n === 'band') (kopf.push(`{artist: ${wert}}`), (interpret = true));
      else if (CHORD.test(wert.split(/\s+/)[0])) kopf.push(`{key: ${ohneKlammern(wert.split(/\s+/)[0])}}`);
      continue;
    }
    const capo = /^capo\s*:?\s*(\d+)/i.exec(t);
    if (capo) {
      if (+capo[1] > 0 && +capo[1] < 12) kopf.push(`{capo: ${+capo[1]}}`);
      continue;
    }
    // „Intro: G D Em C“ – Bezeichnung als Abschnitt, Akkorde dahinter
    const mitAkkorden = /^([A-Za-zäöü -]+?)\s*:\s*(.+)$/.exec(t);
    if (mitAkkorden && ABSCHNITT.test(mitAkkorden[1]) && istAkkordzeile(mitAkkorden[2])) {
      const a = ABSCHNITT.exec(mitAkkorden[1])!;
      out.push(`{comment: ${abschnittName(a[1], a[2])}}`, nurAkkorde(mitAkkorden[2]));
      u.abschnitte++;
      u.akkordzeilen++;
      continue;
    }

    out.push(zeile.trimEnd());
  }

  if (!interpret && meta.artist) kopf.unshift(`{artist: ${meta.artist}}`);
  if (!titel && meta.title) kopf.unshift(`{title: ${meta.title}}`);
  // führende und doppelte Leerzeilen weg
  const rumpf = out.join('\n').replace(/^\s*\n/, '').replace(/\n{3,}/g, '\n\n').trimEnd();
  u.text = [...kopf, ...(kopf.length && rumpf ? [''] : []), rumpf].join('\n');
  return u;
}
