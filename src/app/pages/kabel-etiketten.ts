import technik from '../data/technik.json';

// Kabel- und Stagebox-Etiketten (Backstage): je Kanal zwei Etiketten (Pult- und Bühnenseite), dazu je Monitorweg
// eins – Farbe nach Musiker, alles aus src/app/data/technik.json. Ausdrucken, ausschneiden, mit Klebeband anbringen.
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const FARBE: Record<string, string> = { david: '#1e6fd9', fred: '#2e8b3e', matthias: '#c62828' };
const GRAU = '#616161';

export function printKabelEtiketten(): void {
  const label = (id: string) => technik.aufbau.find((i) => i.id === id)?.label ?? id;
  const etikett = (nr: string, titel: string, info: string, farbe: string) =>
    `<div class="e"><b style="background:${farbe}">${esc(nr)}</b><span><strong>${esc(titel)}</strong><small>${esc(info)}</small></span></div>`;

  const kanaele = technik.kanaele.flatMap((k) => {
    const farbe = (k.musiker && FARBE[k.musiker]) || GRAU;
    const info = [k.art, k.geraet, k.phantom ? '48 V' : ''].filter(Boolean).join(' · ');
    return [etikett(String(k.kanal), k.quelle, info + ' · Pult', farbe), etikett(String(k.kanal), k.quelle, info + ' · Bühne', farbe)];
  });
  const monitore = (technik.monitore as { id: string; fuer: string; musiker?: string }[]).map((m, i) =>
    etikett(`A${i + 1}`, label(m.id), `Aux ${i + 1} → ${m.fuer}`, (m.musiker && FARBE[m.musiker]) || GRAU),
  );

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Kabel-Etiketten – Blickfeld Nord</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #000; padding-bottom: 3px; margin-bottom: 6mm; font-size: 9pt; }
  h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: .18em; margin: 4mm 0 2mm; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
  .e { display: flex; align-items: stretch; height: 18mm; border: 1px dashed #888; break-inside: avoid; }
  .e b { display: grid; place-items: center; width: 16mm; color: #fff; font-size: 20pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .e span { display: flex; flex-direction: column; justify-content: center; gap: 1mm; padding: 0 3mm; min-width: 0; }
  .e strong { font-size: 11pt; }
  .e small { font-size: 7.5pt; color: #444; }
  .legende { display: flex; gap: 6mm; margin-top: 6mm; font-size: 8pt; }
  .legende i { display: inline-block; width: 3mm; height: 3mm; margin-right: 1.5mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>
<header><b>BLICKFELD NORD · KABEL-ETIKETTEN</b><span>Stand Technik ${new Date(`${technik.stand}T12:00:00`).toLocaleDateString('de-DE')}</span></header>
<h2>Kanäle – je ein Etikett für Pult- und Bühnenseite</h2>
<div class="grid">${kanaele.join('')}</div>
<h2>Monitorwege</h2>
<div class="grid">${monitore.join('')}</div>
<p class="legende"><span><i style="background:${FARBE['david']}"></i>David</span><span><i style="background:${FARBE['fred']}"></i>Fred</span><span><i style="background:${FARBE['matthias']}"></i>Matthias</span><span><i style="background:${GRAU}"></i>allgemein</span></p>
</body></html>`);
  win.document.close();
  // Drucken von hier aus starten – ein Skript im Fenster würde die Content-Security-Policy brauchen
  win.focus();
  win.print();
}
