import { Show } from './band.service';

// Gig-Plakat im Logo-Design, direkt im Browser gezeichnet (Canvas) – Format 1080 × 1350 (Instagram-Hochformat).
// Auf dem Handy öffnet sich das Teilen-Menü (z. B. direkt Instagram), am Rechner wird das Bild heruntergeladen.

const W = 1080;
const H = 1350;
const NIGHT = '#141619';
const INK = '#ece9e4';
const FOG = '#8d939b';
const SUNSET = '#e8a46a';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export function posterFileName(s: Show): string {
  const slug = s.venue
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `blickfeld-nord-plakat-${s.date}-${slug}.png`;
}

function formatDate(date: string): { weekday: string; day: string } {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return { weekday, day: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}` };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Text mit Buchstabenabstand zentriert zeichnen (wie die gesperrten Überschriften der Website) */
function spaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, tracking: number): void {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = 'center';
}

/** Schrift so verkleinern, dass der Text in die Breite passt */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, max: number): void {
  let px = start;
  ctx.font = font(px);
  while (ctx.measureText(text).width > max && px > 20) {
    px -= 2;
    ctx.font = font(px);
  }
}

export async function renderPoster(s: Show): Promise<Blob> {
  // Schriften der Website sicher geladen, bevor gezeichnet wird
  await Promise.all([
    document.fonts.load('400 64px Michroma'),
    document.fonts.load('300 32px Montserrat'),
    document.fonts.load('400 32px Montserrat'),
    document.fonts.load('600 32px Inter'),
    document.fonts.load('400 32px Inter'),
  ]);
  const hero = await loadImage('hero.webp');

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, W, H);

  // Logo-Motiv oben in voller Breite
  const heroW = W;
  const heroH = (heroW * hero.height) / hero.width;
  const heroY = 60;
  ctx.drawImage(hero, (W - heroW) / 2, heroY, heroW, heroH);
  // weicher Übergang in den dunklen Infobereich
  const fade = ctx.createLinearGradient(0, heroY + heroH * 0.62, 0, heroY + heroH);
  fade.addColorStop(0, 'rgba(20, 22, 25, 0)');
  fade.addColorStop(1, NIGHT);
  ctx.fillStyle = fade;
  ctx.fillRect(0, heroY + heroH * 0.62, W, heroH * 0.38 + 2);
  const top = ctx.createLinearGradient(0, 0, 0, heroY + 80);
  top.addColorStop(0, NIGHT);
  top.addColorStop(1, 'rgba(20, 22, 25, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, heroY + 80);

  // Sonnenuntergangs-Schimmer am unteren Rand
  const glow = ctx.createRadialGradient(W / 2, H + 120, 40, W / 2, H + 120, 760);
  glow.addColorStop(0, 'rgba(232, 164, 106, .28)');
  glow.addColorStop(1, 'rgba(232, 164, 106, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, H - 640, W, 640);

  const cx = W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let y = heroY + heroH + 20;

  // „LIVE“ mit Linien links und rechts
  ctx.fillStyle = SUNSET;
  ctx.font = '400 30px Montserrat';
  spaced(ctx, 'LIVE', cx, y, 18);
  ctx.strokeStyle = SUNSET;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 230, y - 10);
  ctx.lineTo(cx - 90, y - 10);
  ctx.moveTo(cx + 90, y - 10);
  ctx.lineTo(cx + 230, y - 10);
  ctx.stroke();

  // Datum
  const { weekday, day } = formatDate(s.date);
  const end = s.endDate ? formatDate(s.endDate) : null;
  y += 74;
  ctx.fillStyle = FOG;
  ctx.font = '300 34px Montserrat';
  spaced(ctx, (end ? `${weekday} bis ${end.weekday}` : weekday).toUpperCase(), cx, y, 10);
  y += 104;
  ctx.fillStyle = INK;
  const dateText = end ? `${day.slice(0, 6)} – ${end.day}` : day;
  fit(ctx, dateText, (px) => `400 ${px}px Michroma`, 92, W - 120);
  ctx.fillText(dateText, cx, y);
  if (s.time) {
    y += 70;
    ctx.fillStyle = SUNSET;
    ctx.font = '400 44px Montserrat';
    spaced(ctx, `${s.time} UHR`, cx, y, 8);
  }

  // Location und Ort
  y += 110;
  ctx.fillStyle = INK;
  fit(ctx, s.venue, (px) => `600 ${px}px Inter`, 60, W - 120);
  ctx.fillText(s.venue, cx, y);
  if (s.city) {
    y += 58;
    ctx.fillStyle = FOG;
    ctx.font = '400 38px Inter';
    ctx.fillText(s.city, cx, y);
  }

  // Fußzeile
  ctx.fillStyle = INK;
  ctx.font = '400 28px Montserrat';
  spaced(ctx, 'BLICKFELD-NORD.DE', cx, H - 70, 8);
  ctx.fillStyle = FOG;
  ctx.font = '400 26px Inter';
  ctx.fillText('Instagram @blickfeldnord', cx, H - 30);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Plakat konnte nicht erzeugt werden'))), 'image/png'));
}

export async function sharePoster(s: Show): Promise<void> {
  const blob = await renderPoster(s);
  const name = posterFileName(s);
  const file = new File([blob], name, { type: 'image/png' });
  // Handy: Teilen-Menü (Instagram, WhatsApp, Fotos …); Rechner: Download
  if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file], title: `Blickfeld Nord live – ${s.venue}` });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
