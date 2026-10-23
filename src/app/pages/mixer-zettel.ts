import { Show } from '../data/band.service';
import technik from '../data/technik.json';

// Mixer-Spickzettel pro Auftritt (Backstage): Kanalliste mit Mikro, Stativ und 48 V, dazu die Monitormischungen als
// Matrix und die Stromverteilung – eine A4-Seite quer zum Aufbauen. Alle Angaben aus src/app/data/technik.json.
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const de = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

interface Monitor {
  id: string;
  fuer: string;
  mix: { kanal: number; pegel: string }[] | null;
  vorschlag?: boolean;
  notiz?: string;
}

export function printMixerZettel(show: Show): void {
  const monitore = technik.monitore as Monitor[];
  const label = (id: string) => technik.aufbau.find((i) => i.id === id)?.label ?? id;
  const pegel = (m: Monitor, kanal: number) => m.mix?.find((x) => x.kanal === kanal)?.pegel ?? '';

  const kopf = monitore
    .map((m, i) => `<th class="mon">${esc(label(m.id))}<br><small>Aux ${i + 1} · ${esc(m.fuer)}${m.mix ? (m.vorschlag ? ' · Vorschlag' : '') : ' · offen'}</small></th>`)
    .join('');
  const zeilen = technik.kanaele
    .map(
      (k) => `<tr>
        <td class="num">${k.kanal}</td>
        <td><b>${esc(k.quelle)}</b></td>
        <td>${esc(k.art)}</td>
        <td>${k.geraet ? esc(k.geraet) : k.art === 'DI' ? '–' : '<span class="blank"></span>'}</td>
        <td>${esc(k.stativ ?? '–')}</td>
        <td>${k.phantom ? '48 V' : '–'}</td>
        ${monitore.map((m) => `<td class="mon ${pegel(m, k.kanal)}">${esc(pegel(m, k.kanal)) || '–'}</td>`).join('')}
      </tr>`,
    )
    .join('');
  const notizen = monitore
    .filter((m) => m.notiz)
    .map((m) => `<li><b>${esc(label(m.id))} (${esc(m.fuer)}):</b> ${esc(m.notiz!)}</li>`)
    .join('');
  const strom = technik.strom.map((s) => `<li><b>${esc(label(s.id))}:</b> ${esc(s.verbraucher.join(', '))}</li>`).join('');

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Mixer-Zettel – ${esc(show.venue)} – ${show.date}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; font-size: 10.5pt; line-height: 1.35; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #000; padding-bottom: 4px; margin-bottom: 8px; }
  header b { font-size: 16pt; letter-spacing: .06em; }
  h1 { font-size: 15pt; margin: 0 0 2px; }
  .when { margin: 0 0 8px; }
  h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: .18em; margin: 10px 0 5px; padding-bottom: 2px; border-bottom: 1px solid #000; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #eee; font-size: 9pt; }
  th small { font-weight: normal; }
  .num { width: 9mm; text-align: center; font-weight: bold; font-size: 12pt; }
  .mon { text-align: center; width: 30mm; }
  .laut { font-weight: bold; }
  .leise { color: #555; }
  .blank { display: inline-block; width: 100%; border-bottom: 1px dotted #888; height: 1em; }
  .cols { display: grid; grid-template-columns: 2fr 1fr; gap: 0 10mm; }
  ul { margin: 0; padding-left: 5mm; }
  li { margin-bottom: 3px; }
  footer { margin-top: 10px; font-size: 8pt; color: #666; }
</style></head><body>
<header><b>BLICKFELD NORD</b><span>Mixer-Zettel · ${esc(technik.hardware.mischpult.modell ?? 'Mischpult')}</span></header>
<h1>${esc(show.venue)}</h1>
<p class="when">${de(show.date)}${show.time ? ', ' + show.time + ' Uhr' : ''}${show.city ? ' · ' + esc(show.city) : ''}</p>
<h2>Kanäle und Monitormischungen</h2>
<table>
  <thead><tr><th class="num">Ch</th><th>Quelle</th><th>Art</th><th>Mikro / Gerät</th><th>Stativ</th><th>Phantom</th>${kopf}</tr></thead>
  <tbody>${zeilen}</tbody>
</table>
<div class="cols">
  <div><h2>Monitore</h2><ul>${notizen || '<li>Mischungen noch offen</li>'}</ul></div>
  <div><h2>Strom</h2><ul>${strom}</ul></div>
</div>
<footer>Stand Technik ${new Date(`${technik.stand}T12:00:00`).toLocaleDateString('de-DE')} · Main L/R → PA · Pegel: laut / mittel / leise, „–“ = nicht im Monitor</footer>
</body></html>`);
  win.document.close();
  // Drucken von hier aus starten – ein Skript im Fenster würde die Content-Security-Policy brauchen
  win.focus();
  win.print();
}
