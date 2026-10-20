import { Show } from '../data/band.service';
import { loadSetlist, setLength, setTime, setsOf } from '../data/setlist-data';
import { arrivalTime, departureTime, DEFAULT_START } from '../data/trip';
import { GROUPS, PACKLISTE_PREFIX, loadPackliste } from './packliste';
import { FIELDS, VORORT_PREFIX, loadVorOrt } from './vorort';

// Laufzettel pro Auftritt (Backstage): alles für den Abend auf einem Ausdruck bzw. PDF –
// Zeitplan mit Abfahrt, Vor-Ort-Angaben, Setlist mit Spieldauer und Packliste zum Abhaken.
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const de = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function printLaufzettel(show: Show, id: string): void {
  const v = loadVorOrt(VORORT_PREFIX + id);
  const val = (k: string) => v[k]?.trim() || '';
  const sets = setsOf(loadSetlist(id));
  const pack = loadPackliste(PACKLISTE_PREFIX + id);

  const row = (label: string, value: string) => `<tr><th>${esc(label)}</th><td>${value ? esc(value) : '<span class="blank"></span>'}</td></tr>`;
  const departure = departureTime(v);
  const plan = [
    row('Abfahrt', departure ? `${departure} Uhr ab ${val('start') || DEFAULT_START}` : ''),
    row('Fahrzeit', val('fahrzeit') ? `${val('fahrzeit')} min (+ ${val('puffer') || 15} min Puffer)` : ''),
    row('Ankunft / Aufbau', arrivalTime(v) ? `${arrivalTime(v)} Uhr` : val('ankunft')),
    row('Soundcheck', val('soundcheck')),
    row('Beginn', show.time ? `${show.time} Uhr` : ''),
  ].join('');
  const vorOrt = FIELDS.filter((f) => !['ankunft', 'soundcheck'].includes(f.key)).map((f) => row(f.label, val(f.key))).join('');

  let n = 0;
  const setlist = sets.length
    ? sets
        .map((set, i) => {
          const sec = setLength(set).seconds;
          return `<section class="set"><h3>Set ${i + 1}${sec ? ` · ${setTime(sec)}` : ''}</h3><ol>${set.map((t) => `<li value="${++n}">${esc(t.title)} <small>${esc(t.artist)}</small></li>`).join('')}</ol></section>`;
        })
        .join('')
    : '<p class="note">Noch keine Setlist angelegt.</p>';

  const groups = [...GROUPS, { title: 'Eigene Punkte', items: pack.custom }].filter((g) => g.items.length);
  const packliste = groups
    .map((g) => `<section class="group"><h3>${esc(g.title)}</h3><ul>${g.items.map((i) => `<li class="${pack.checked.includes(i) ? 'done' : ''}">${esc(i)}</li>`).join('')}</ul></section>`)
    .join('');

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Laufzettel – ${esc(show.venue)} – ${show.date}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; font-size: 10.5pt; line-height: 1.35; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #000; padding-bottom: 4px; margin-bottom: 10px; }
  header b { font-size: 16pt; letter-spacing: .06em; }
  h1 { font-size: 18pt; margin: 0 0 2px; }
  .when { margin: 0 0 6px; font-size: 11pt; }
  h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: .18em; margin: 10px 0 5px; padding-bottom: 2px; border-bottom: 1px solid #000; }
  h3 { font-size: 10pt; margin: 0 0 4px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10mm; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-weight: normal; color: #444; width: 38%; padding: 2px 6px 2px 0; vertical-align: top; }
  td { padding: 2px 0; white-space: pre-line; }
  .blank { display: inline-block; width: 100%; border-bottom: 1px dotted #888; height: 1.1em; }
  .sets { columns: 2; column-gap: 10mm; }
  .set { break-inside: avoid; margin-bottom: 6px; }
  ol { margin: 0; padding-left: 7mm; }
  ol li { font-weight: bold; }
  small { font-weight: normal; color: #555; }
  .packs { columns: 4; column-gap: 5mm; font-size: 9pt; line-height: 1.3; }
  .group { break-inside: avoid; margin-bottom: 6px; }
  ul { list-style: none; margin: 0; padding: 0; }
  ul li::before { content: '☐ '; }
  ul li.done::before { content: '☑ '; }
  ul li.done { color: #666; }
  .note { color: #555; margin: 0; }
  footer { margin-top: 12px; font-size: 8pt; color: #666; }
</style></head><body>
<header><b>BLICKFELD NORD</b><span>Laufzettel</span></header>
<h1>${esc(show.venue)}</h1>
<p class="when">${de(show.date)}${show.endDate ? ' – ' + de(show.endDate) : ''}${show.time ? ', ' + show.time + ' Uhr' : ''}${show.city ? ' · ' + esc(show.city) : ''}</p>
<div class="cols">
  <div><h2>Zeitplan</h2><table>${plan}</table></div>
  <div><h2>Vor Ort</h2><table>${vorOrt}${show.comment ? row('Kommentar', show.comment) : ''}</table></div>
</div>
<h2>Setlist</h2><div class="sets">${setlist}</div>
<h2>Packliste</h2><div class="packs">${packliste}</div>
<footer>Stand ${new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} · leere Felder zum Ausfüllen vor Ort</footer>
<script>window.onload = () => { window.print(); };</script>
</body></html>`);
  win.document.close();
}
