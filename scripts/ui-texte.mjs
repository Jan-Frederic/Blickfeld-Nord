// Sammelt alle Oberflächentexte aus tr(de, en, nl) in src/app (Menüs, Buttons, Hinweise …) und schreibt sie nach
// src/app/data/ui-texte.json – für Backstage → Übersetzungen („Oberfläche gegenlesen“).
// Texte mit Platzhaltern (Funktionen wie (n) => `${n} Songs`) erscheinen mit {1}, {2} … an deren Stelle.
// Aufruf: node scripts/ui-texte.mjs  (läuft auch beim Deploy; mit --pruefen nur vergleichen, Abbruch bei Abweichung)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src/app/data/ui-texte.json');

function dateien(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? dateien(p) : p.endsWith('.ts') && !p.endsWith('.spec.ts') ? [p] : [];
  });
}

// Argumente von tr( … ) per Klammerzählung (Strings und Template-Literale beachtet)
function trAufrufe(src) {
  const out = [];
  const re = /\btr\(/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + 3, tiefe = 1, str = null;
    for (; i < src.length && tiefe; i++) {
      const c = src[i];
      if (str) {
        if (c === '\\') i++;
        else if (c === str) str = null;
      } else if (c === "'" || c === '"' || c === '`') str = c;
      else if ('([{'.includes(c)) tiefe++;
      else if (')]}'.includes(c)) tiefe--;
    }
    out.push(src.slice(m.index + 3, i - 1));
  }
  return out;
}

const PLATZHALTER = ['{1}', '{2}', '{3}', '{4}'];
function flach(obj, prefix = '') {
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') res[key] = v;
    else if (typeof v === 'function') {
      try {
        const r = v(...PLATZHALTER);
        if (typeof r === 'string') res[key] = r;
      } catch {
        // Funktion braucht andere Argumente – überspringen
      }
    } else if (Array.isArray(v)) v.forEach((x, i) => Object.assign(res, typeof x === 'string' ? { [`${key}.${i}`]: x } : flach(x, `${key}.${i}`)));
    else if (v && typeof v === 'object') Object.assign(res, flach(v, key));
  }
  return res;
}

const texte = [];
for (const datei of dateien(path.join(ROOT, 'src/app')).sort()) {
  const src = fs.readFileSync(datei, 'utf8');
  if (!/import\s*\{[^}]*\btr\b[^}]*\}\s*from\s*'\.\.?\/(?:\.\.\/)?i18n'/.test(src)) continue;
  let n = 0;
  for (const args of trAufrufe(src)) {
    let werte;
    try {
      const js = ts.transpileModule(`[${args}]`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
      // Konstanten aus der Datei (z. B. PRESS_TEXT_DE) stehen nicht zur Verfügung – solche Aufrufe auslassen
      werte = vm.runInNewContext(js, {});
    } catch {
      continue;
    }
    if (!Array.isArray(werte) || werte.length !== 3) continue;
    // tr('Titel', 'Title', 'Titel') mit einfachen Texten (z. B. Seitentitel in app.routes.ts) oder mit Objekten
    const [de, en, nl] = werte.map((w) => (typeof w === 'string' ? { text: w } : flach(w)));
    const rel = path.relative(path.join(ROOT, 'src/app'), datei).replace(/\\/g, '/');
    for (const key of Object.keys(de)) if (de[key] !== en[key] || de[key] !== nl[key]) texte.push({ datei: rel, key: key === 'text' ? `#${++n}` : key, de: de[key], en: en[key] ?? '', nl: nl[key] ?? '' });
  }
}

const json = JSON.stringify(texte, null, 1) + '\n';
if (process.argv.includes('--pruefen')) {
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== json) {
    console.error('src/app/data/ui-texte.json ist veraltet – bitte „node scripts/ui-texte.mjs“ ausführen.');
    process.exit(1);
  }
  console.log(`Oberflächentexte aktuell: ${texte.length}`);
} else {
  fs.writeFileSync(OUT, json);
  console.log(`${texte.length} Oberflächentexte → ${path.relative(ROOT, OUT)}`);
}
