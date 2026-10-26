// PDF-Anzeige mit pdf.js – wird erst geladen, wenn ein Notenblatt geöffnet wird, und liegt bewusst nicht im
// Programmcode der Website (/pdfjs/ aus node_modules, siehe angular.json): Besucher laden es nie mit.
// Der „legacy“-Build bringt Ersatz für neueste JavaScript-Funktionen mit – sonst bleiben ältere Tablets leer.

// nur die Teile von pdf.js, die hier gebraucht werden
export interface PdfSeite {
  getViewport(o: { scale: number }): { width: number; height: number };
  render(o: { canvasContext: CanvasRenderingContext2D; canvas?: HTMLCanvasElement; viewport: unknown }): { promise: Promise<void>; cancel(): void };
}
export interface PdfDokument {
  numPages: number;
  getPage(n: number): Promise<PdfSeite>;
  destroy(): Promise<void>;
}
interface PdfJs {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(o: Record<string, unknown>): { promise: Promise<PdfDokument> };
}

let pdfjs: Promise<PdfJs> | undefined;
function laden(): Promise<PdfJs> {
  // Adresse als Variable: so bündelt Angular pdf.js nicht mit, sondern lädt es zur Laufzeit
  const url = '/pdfjs/pdf.min.mjs';
  pdfjs ??= (import(/* @vite-ignore */ url) as Promise<PdfJs>).then((m) => {
    m.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    return m;
  });
  return pdfjs;
}

export async function pdfOeffnen(daten: ArrayBuffer): Promise<PdfDokument> {
  const m = await laden();
  // Kopie übergeben – pdf.js übernimmt den Puffer in den Worker und macht das Original unbrauchbar
  return m.getDocument({
    data: new Uint8Array(daten.slice(0)),
    isEvalSupported: false,
    wasmUrl: '/pdfjs/wasm/',
    standardFontDataUrl: '/pdfjs/standard_fonts/',
  }).promise;
}

// laufendes Zeichnen je Leinwand – ein neues bricht das alte ab (pdf.js erlaubt nur eines gleichzeitig)
const laufend = new WeakMap<HTMLCanvasElement, { cancel(): void }>();

/** eine Seite so in die Leinwand zeichnen, dass sie in breite × hoehe passt (bzw. nur die Breite füllt) */
export async function seiteZeichnen(doc: PdfDokument, nr: number, canvas: HTMLCanvasElement, breite: number, hoehe: number, nurBreite: boolean): Promise<void> {
  const seite = await doc.getPage(nr);
  const basis = seite.getViewport({ scale: 1 });
  const massstab = nurBreite ? breite / basis.width : Math.min(breite / basis.width, hoehe / basis.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const viewport = seite.getViewport({ scale: massstab * dpr });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
  canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
  laufend.get(canvas)?.cancel();
  const auftrag = seite.render({ canvasContext: canvas.getContext('2d')!, canvas, viewport });
  laufend.set(canvas, auftrag);
  try {
    await auftrag.promise;
  } catch (e) {
    // abgebrochen, weil schon neu gezeichnet wird – kein Fehler
    if ((e as Error).name !== 'RenderingCancelledException') throw e;
  }
}
