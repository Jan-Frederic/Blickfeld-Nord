import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/technik.json';

// Technischer Aufbau aus src/app/data/technik.json: Bühnenplan (Draufsicht), Kanalliste, Monitore,
// Signalfluss und Stromverteilung. Dieselbe Datei nutzt der Technik-Rider (scripts/build-rider.py).
// Werte mit null gelten als „noch offen“.

interface Item {
  id: string;
  typ: 'drums' | 'person' | 'amp' | 'mixer' | 'monitor' | 'pa' | 'licht' | 'strom';
  label: string;
  rolle?: string;
  x: number;
  y: number;
  b?: number;
  t?: number;
  drehung?: number;
}

const M = 140; // Pixel pro Meter
const PAD_X = 100;
const PAD_TOP = 46;
const W = data.buehne.breite;
const D = data.buehne.tiefe;

const px = (m: number) => PAD_X + m * M;
const py = (m: number) => PAD_TOP + m * M;

@Component({
  selector: 'app-technik-aufbau',
  imports: [MatIconModule],
  template: `
    <p class="draft"><mat-icon>edit_note</mat-icon><span>{{ status }}</span></p>

    <h4>Bühnenplan</h4>
    <figure class="plot">
      <svg [attr.viewBox]="viewBox" role="img" aria-labelledby="plot-title plot-desc">
        <title id="plot-title">Bühnenplan von Blickfeld Nord, Draufsicht</title>
        <desc id="plot-desc">{{ description }}</desc>

        <!-- Spielfläche mit 1-m-Raster -->
        <rect class="stage" [attr.x]="px(0)" [attr.y]="py(0)" [attr.width]="W * M" [attr.height]="D * M" rx="6" />
        @for (g of gridX; track g) {
          <line class="grid" [attr.x1]="px(g)" [attr.y1]="py(0)" [attr.x2]="px(g)" [attr.y2]="py(D)" />
        }
        @for (g of gridY; track g) {
          <line class="grid" [attr.x1]="px(0)" [attr.y1]="py(g)" [attr.x2]="px(W)" [attr.y2]="py(g)" />
        }
        <text class="dim" [attr.x]="px(W / 2)" [attr.y]="py(0) - 26" text-anchor="middle">SPIELFLÄCHE {{ W }} × {{ D }} M</text>
        <text class="audience" [attr.x]="px(W / 2)" [attr.y]="py(D) + 50" text-anchor="middle">▼  PUBLIKUM  ▼</text>

        @for (it of items; track it.id) {
          @switch (it.typ) {
            @case ('drums') {
              <rect class="riser" [attr.x]="px(it.x - it.b! / 2)" [attr.y]="py(it.y - it.t! / 2)" [attr.width]="it.b! * M" [attr.height]="it.t! * M" rx="10" />
              <circle class="drum" [attr.cx]="px(it.x)" [attr.cy]="py(it.y + 0.3)" r="26" />
              <circle class="drum" [attr.cx]="px(it.x - 0.42)" [attr.cy]="py(it.y + 0.12)" r="15" />
              <circle class="drum" [attr.cx]="px(it.x - 0.18)" [attr.cy]="py(it.y - 0.18)" r="13" />
              <circle class="drum" [attr.cx]="px(it.x + 0.18)" [attr.cy]="py(it.y - 0.18)" r="13" />
              <circle class="drum" [attr.cx]="px(it.x + 0.45)" [attr.cy]="py(it.y + 0.1)" r="17" />
              <circle class="cymbal" [attr.cx]="px(it.x - 0.6)" [attr.cy]="py(it.y - 0.38)" r="20" />
              <circle class="cymbal" [attr.cx]="px(it.x + 0.6)" [attr.cy]="py(it.y - 0.38)" r="22" />
              <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y - it.t! / 2) + 16" text-anchor="middle">{{ it.label }}</text>
            }
            @case ('person') {
              <circle class="person" [attr.cx]="px(it.x)" [attr.cy]="py(it.y)" r="21" />
              <text class="initial" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 6" text-anchor="middle">{{ it.label[0] }}</text>
              @if (it.id !== 'matthias') {
                <text class="label" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 42" text-anchor="middle">{{ it.label }}</text>
                <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 58" text-anchor="middle">{{ it.rolle }}</text>
              }
            }
            @case ('amp') {
              <rect class="box" [attr.x]="px(it.x - it.b! / 2)" [attr.y]="py(it.y - it.t! / 2)" [attr.width]="it.b! * M" [attr.height]="it.t! * M" rx="4" />
              <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 4" text-anchor="middle">Bass-Amp</text>
            }
            @case ('mixer') {
              <rect class="box" [attr.x]="px(it.x - it.b! / 2)" [attr.y]="py(it.y - it.t! / 2)" [attr.width]="it.b! * M" [attr.height]="it.t! * M" rx="4" />
              @for (f of [-0.22, -0.11, 0, 0.11, 0.22]; track f) {
                <line class="fader" [attr.x1]="px(it.x + f)" [attr.y1]="py(it.y - 0.1)" [attr.x2]="px(it.x + f)" [attr.y2]="py(it.y + 0.14)" />
              }
              <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y - it.t! / 2) - 8" text-anchor="middle">{{ it.label }}</text>
            }
            @case ('monitor') {
              <g [attr.transform]="'rotate(' + (it.drehung ?? 0) + ' ' + px(it.x) + ' ' + py(it.y) + ')'">
                <polygon class="wedge" [attr.points]="wedge(it)" />
              </g>
              <text class="tiny" [attr.x]="px(it.x)" [attr.y]="py(it.y) + (it.drehung ? 44 : 30)" text-anchor="middle">{{ it.label }}</text>
            }
            @case ('pa') {
              <rect class="pa" [attr.x]="px(it.x) - 26" [attr.y]="py(it.y) - 52" width="52" height="104" rx="4" />
              <circle class="cone" [attr.cx]="px(it.x)" [attr.cy]="py(it.y) - 22" r="14" />
              <circle class="cone" [attr.cx]="px(it.x)" [attr.cy]="py(it.y) + 22" r="18" />
              <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y) - 62" text-anchor="middle">PA</text>
            }
            @case ('licht') {
              <circle class="light" [attr.cx]="px(it.x)" [attr.cy]="py(it.y)" r="14" />
              <circle class="light-core" [attr.cx]="px(it.x)" [attr.cy]="py(it.y)" r="6" />
            }
            @case ('strom') {
              <rect class="power" [attr.x]="px(it.x) - 15" [attr.y]="py(it.y) - 12" width="30" height="24" rx="4" />
              <text class="power-sym" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 6" text-anchor="middle">⚡</text>
              <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y) - 20" text-anchor="middle">{{ it.label }}</text>
            }
          }
        }
      </svg>
      <figcaption>
        <span><i class="key person"></i> Musiker</span>
        <span><i class="key wedge"></i> Monitor</span>
        <span><i class="key pa"></i> PA</span>
        <span><i class="key light"></i> Licht</span>
        <span><i class="key power"></i> Steckdose</span>
        <span>Ansicht von oben, Publikum unten · 1 Kästchen = 1 m</span>
      </figcaption>
    </figure>

    <h4>Kanalliste</h4>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Kanal</th><th>Quelle</th><th>Art</th><th>Gerät</th><th>Stativ</th><th>48 V</th></tr>
        </thead>
        <tbody>
          @for (k of kanaele; track k.kanal) {
            <tr>
              <td class="num">{{ k.kanal }}</td>
              <td>{{ k.quelle }}</td>
              <td>{{ k.art }}</td>
              <td [class.open]="!k.geraet">{{ k.geraet ?? 'offen' }}</td>
              <td [class.open]="!k.stativ">{{ k.stativ ?? '–' }}</td>
              <td>{{ k.phantom ? 'ja' : '–' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <h4>Signalfluss</h4>
    <div class="flow">
      <div class="col">
        <span class="col-title">Quellen</span>
        @for (k of kanaele; track k.kanal) {
          <span class="chip"><b>{{ k.kanal }}</b> {{ k.quelle }}</span>
        }
      </div>
      <mat-icon class="arrow">arrow_forward</mat-icon>
      <div class="col center">
        <span class="col-title">Mischpult</span>
        <span class="chip strong" [class.open]="!geraete.mischpult">{{ geraete.mischpult ?? 'Modell offen' }}</span>
      </div>
      <mat-icon class="arrow">arrow_forward</mat-icon>
      <div class="col">
        <span class="col-title">Ausgänge</span>
        <span class="chip">Main L/R → PA links und rechts</span>
        @for (m of monitore; track m.id) {
          <span class="chip">Aux {{ $index + 1 }} → {{ label(m.id) }} ({{ m.fuer }})</span>
        }
      </div>
    </div>

    <div class="two">
      <div>
        <h4>Monitore</h4>
        <ul class="list">
          @for (m of monitore; track m.id) {
            <li><b>{{ label(m.id) }}</b> für {{ m.fuer }}: <span [class.open]="!m.mix">{{ m.mix ?? 'Mischung offen' }}</span></li>
          }
        </ul>
      </div>
      <div>
        <h4>Strom</h4>
        <ul class="list">
          @for (s of strom; track s.id) {
            <li><b>{{ label(s.id) }}:</b> {{ s.verbraucher.join(', ') }}</li>
          }
        </ul>
      </div>
    </div>
    <p class="stand">Stand {{ stand }}</p>
  `,
  styles: `
    :host { display: block; }
    h4 { margin: 32px 0 12px; font-family: var(--bn-wide); font-weight: 400; font-size: .8rem; text-transform: uppercase; letter-spacing: .14em; color: var(--bn-fog); }
    .draft {
      display: flex; gap: 10px; align-items: flex-start; margin: 0; padding: 12px 14px; border-radius: 8px;
      background: rgba(232, 164, 106, .08); border: 1px solid rgba(232, 164, 106, .3); font-size: .9rem; line-height: 1.5;
    }
    .draft mat-icon { flex: none; color: var(--bn-sunset); }
    .plot { margin: 0; padding: 16px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    svg { display: block; width: 100%; max-width: 760px; height: auto; margin: 0 auto; font-family: var(--bn-body, Inter, sans-serif); }
    .stage { fill: rgba(236, 233, 228, .03); stroke: var(--bn-fog); stroke-width: 2; }
    .grid { stroke: rgba(236, 233, 228, .08); stroke-dasharray: 4 6; }
    .dim, .audience { fill: var(--bn-fog); font-size: 13px; letter-spacing: .16em; }
    .audience { fill: var(--bn-sunset); }
    .riser { fill: rgba(236, 233, 228, .04); stroke: rgba(236, 233, 228, .25); stroke-dasharray: 5 4; }
    .drum { fill: #22262b; stroke: var(--bn-ink); stroke-width: 1.5; }
    .cymbal { fill: rgba(232, 164, 106, .12); stroke: var(--bn-sunset); stroke-width: 1.2; }
    .person { fill: var(--bn-sunset); }
    .initial { fill: #2a1708; font-size: 17px; font-weight: 700; }
    .label { fill: var(--bn-ink); font-size: 14px; font-weight: 600; }
    .small { fill: var(--bn-fog); font-size: 12px; }
    .tiny { fill: var(--bn-fog); font-size: 11px; }
    .box { fill: #22262b; stroke: var(--bn-ink); stroke-width: 1.5; }
    .fader { stroke: var(--bn-sunset); stroke-width: 2; }
    .wedge { fill: #2c3238; stroke: var(--bn-ink); stroke-width: 1.5; }
    .pa { fill: #22262b; stroke: var(--bn-ink); stroke-width: 1.5; }
    .cone { fill: none; stroke: var(--bn-fog); stroke-width: 1.5; }
    .light { fill: rgba(255, 220, 150, .15); stroke: #f5d48f; stroke-width: 1.5; }
    .light-core { fill: #f5d48f; }
    .power { fill: #22262b; stroke: #7fc29b; stroke-width: 1.5; }
    .power-sym { font-size: 14px; fill: #7fc29b; }
    figcaption { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 18px; margin-top: 12px; font-size: .8rem; color: var(--bn-fog); }
    figcaption span { display: inline-flex; align-items: center; gap: 6px; }
    .key { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }
    .key.person { background: var(--bn-sunset); border-radius: 50%; }
    .key.wedge { background: #2c3238; border: 1px solid var(--bn-ink); }
    .key.pa { background: #22262b; border: 1px solid var(--bn-ink); }
    .key.light { background: #f5d48f; border-radius: 50%; }
    .key.power { border: 1px solid #7fc29b; }
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--bn-line); }
    table { width: 100%; border-collapse: collapse; font-size: .92rem; }
    th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--bn-line); white-space: nowrap; }
    th { font-family: var(--bn-wide); font-weight: 400; font-size: .7rem; letter-spacing: .12em; text-transform: uppercase; color: var(--bn-fog); }
    tbody tr:last-child td { border-bottom: 0; }
    .num { color: var(--bn-sunset); font-variant-numeric: tabular-nums; width: 3em; }
    .open { color: var(--bn-fog); font-style: italic; }
    .flow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .col { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 200px; }
    .col.center { flex: 0 1 180px; min-width: 160px; }
    .col-title { font-family: var(--bn-wide); font-size: .68rem; letter-spacing: .14em; text-transform: uppercase; color: var(--bn-fog); }
    .chip { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--bn-line); font-size: .88rem; }
    .chip b { color: var(--bn-sunset); margin-right: 6px; font-variant-numeric: tabular-nums; }
    .chip.strong { padding: 18px 12px; text-align: center; border-color: var(--bn-sunset); }
    .arrow { color: var(--bn-sunset); }
    .two { display: grid; gap: 0 32px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .list { margin: 0; padding-left: 18px; line-height: 1.8; }
    .stand { margin: 20px 0 0; font-size: .78rem; color: var(--bn-fog); }
    @media (max-width: 700px) { .flow { flex-direction: column; align-items: stretch; } .arrow { transform: rotate(90deg); align-self: center; } }
  `,
})
export class TechnikAufbau {
  protected readonly status = data.status;
  protected readonly stand = new Date(`${data.stand}T12:00:00`).toLocaleDateString('de-DE');
  protected readonly items = data.aufbau as Item[];
  protected readonly kanaele = data.kanaele;
  protected readonly monitore = data.monitore;
  protected readonly strom = data.strom;
  protected readonly geraete = data.geraete as { mischpult: string | null; pa: string | null; monitore: string | null; licht: string | null };

  protected readonly W = W;
  protected readonly D = D;
  protected readonly M = M;
  protected readonly px = px;
  protected readonly py = py;
  protected readonly gridX = Array.from({ length: W - 1 }, (_, i) => i + 1);
  protected readonly gridY = Array.from({ length: D - 1 }, (_, i) => i + 1);
  protected readonly viewBox = `0 0 ${2 * PAD_X + W * M} ${PAD_TOP + D * M + 70}`;
  protected readonly description =
    `Spielfläche ${W} × ${D} m. ` + this.items.map((i) => `${i.label}${i.rolle ? ` (${i.rolle})` : ''}`).join(', ') + '.';

  protected label(id: string): string {
    return this.items.find((i) => i.id === id)?.label ?? id;
  }

  // Monitorkeil: Trapez, die schmale Seite zeigt zum Musiker (nach oben = Richtung Bühnenrückseite)
  protected wedge(it: Item): string {
    const x = px(it.x), y = py(it.y);
    return [[x - 26, y + 14], [x + 26, y + 14], [x + 20, y - 10], [x - 20, y - 10]].map((p) => p.join(',')).join(' ');
  }
}
