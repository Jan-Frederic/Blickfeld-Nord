import { Component, computed, inject, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import data from '../data/technik.json';
import { Hardware, HardwareDialog } from './hardware-dialog';
import { I18n, tr } from '../i18n';
import { Content } from '../content';
import { UebersetzungHinweis } from './uebersetzung-hinweis';

const TEXT = tr(
  {
    plan: 'Bühnenplan',
    planTitle: 'Bühnenplan von Blickfeld Nord, Draufsicht',
    area: 'SPIELFLÄCHE',
    audience: 'PUBLIKUM',
    details: 'technische Details anzeigen',
    bassAmp: 'Bass-Amp',
    legend: { musician: 'Musiker', monitor: 'Monitor', mic: 'Mikroständer', pa: 'PA', light: 'Licht', socket: 'Steckdose' },
    caption: 'Ansicht von oben, Publikum unten · 1 Kästchen = 1 m · Geräte und Musiker antippen für Details',
    channels: 'Kanalliste',
    head: { channel: 'Kanal', source: 'Quelle', type: 'Art', device: 'Gerät', stand: 'Stativ' },
    open: 'offen',
    yes: 'ja',
    flow: 'Signalfluss',
    sources: 'Quellen',
    mixer: 'Mischpult',
    modelOpen: 'Modell offen',
    outputs: 'Ausgänge',
    main: 'Main L/R → PA links und rechts',
    devices: 'Geräte',
    modelFollows: 'Modell folgt',
    monitors: 'Monitore',
    for: 'für',
    mixOpen: 'Mischung offen',
    power: 'Strom',
    asOf: 'Stand',
    descArea: 'Spielfläche',
  },
  {
    plan: 'Stage plan',
    planTitle: 'Stage plan of Blickfeld Nord, top view',
    area: 'STAGE AREA',
    audience: 'AUDIENCE',
    details: 'show technical details',
    bassAmp: 'Bass amp',
    legend: { musician: 'Musician', monitor: 'Monitor', mic: 'Mic stand', pa: 'PA', light: 'Lights', socket: 'Power socket' },
    caption: 'Top view, audience at the bottom · 1 square = 1 m · tap equipment or musicians for details',
    channels: 'Channel list',
    head: { channel: 'Channel', source: 'Source', type: 'Type', device: 'Device', stand: 'Stand' },
    open: 'open',
    yes: 'yes',
    flow: 'Signal flow',
    sources: 'Sources',
    mixer: 'Mixing desk',
    modelOpen: 'Model to be confirmed',
    outputs: 'Outputs',
    main: 'Main L/R → PA left and right',
    devices: 'Equipment',
    modelFollows: 'Model to follow',
    monitors: 'Monitors',
    for: 'for',
    mixOpen: 'Mix to be confirmed',
    power: 'Power',
    asOf: 'As of',
    descArea: 'Stage area',
  },
  {
    plan: 'Podiumplan',
    planTitle: 'Podiumplan van Blickfeld Nord, bovenaanzicht',
    area: 'SPEELVLAK',
    audience: 'PUBLIEK',
    details: 'technische details tonen',
    bassAmp: 'Basversterker',
    legend: { musician: 'Muzikant', monitor: 'Monitor', mic: 'Microfoonstandaard', pa: 'PA', light: 'Licht', socket: 'Stopcontact' },
    caption: 'Bovenaanzicht, publiek onderaan · 1 vakje = 1 m · tik op apparatuur of muzikanten voor details',
    channels: 'Kanalenlijst',
    head: { channel: 'Kanaal', source: 'Bron', type: 'Soort', device: 'Apparaat', stand: 'Statief' },
    open: 'open',
    yes: 'ja',
    flow: 'Signaalroute',
    sources: 'Bronnen',
    mixer: 'Mengpaneel',
    modelOpen: 'Model volgt nog',
    outputs: 'Uitgangen',
    main: 'Main L/R → PA links en rechts',
    devices: 'Apparatuur',
    modelFollows: 'Model volgt',
    monitors: 'Monitors',
    for: 'voor',
    mixOpen: 'Mix volgt nog',
    power: 'Stroom',
    asOf: 'Stand van',
    descArea: 'Speelvlak',
  },
);

// Technischer Aufbau aus src/app/data/technik.json: Bühnenplan (Draufsicht), Kanalliste, Monitore,
// Signalfluss und Stromverteilung. Dieselbe Datei nutzt der Technik-Rider (scripts/build-rider.py).
// Werte mit null gelten als „noch offen“. Geräte mit „hw“ sind anklickbar und öffnen einen Dialog mit
// Beschreibung und technischen Daten (Abschnitt „hardware“ der JSON-Datei). Die Musiker öffnen ihr Setup
// („setup-<name>“, nicht in der Geräteliste): Zu der Beschreibung kommen automatisch die Kanäle, Geräte und der
// Monitor, die in der JSON-Datei mit „musiker“ zugeordnet sind – Änderungen also nur an einer Stelle.

interface Item {
  id: string;
  typ: 'drums' | 'person' | 'amp' | 'mixer' | 'monitor' | 'pa' | 'licht' | 'strom' | 'mikro' | 'pedalboard';
  label: string;
  rolle?: string;
  x: number;
  y: number;
  b?: number;
  t?: number;
  drehung?: number;
  hw?: string;
  /** Galgenstativ: Ende des Arms (Position des Mikros) */
  arm?: number[];
  /** PA: Top steht auf einem Subwoofer */
  sub?: boolean;
  /** gehört zum Setup dieses Musikers (id der Person) */
  musiker?: string;
}


const HARDWARE = data.hardware as Record<string, Hardware>;

const M = 140; // Pixel pro Meter
const PAD_X = 100;
const PAD_TOP = 46;
const W = data.buehne.breite;
const D = data.buehne.tiefe;

const px = (m: number) => PAD_X + m * M;
const py = (m: number) => PAD_TOP + m * M;

@Component({
  selector: 'app-technik-aufbau',
  imports: [MatIconModule, HardwareDialog, UebersetzungHinweis],
  template: `
    <p class="draft"><mat-icon>edit_note</mat-icon><span>{{ ct.t(status) }}</span></p>

    <h4>{{ t().plan }}</h4>
    <figure class="plot">
      <svg [attr.viewBox]="viewBox" role="group" aria-labelledby="plot-title plot-desc">
        <title id="plot-title">{{ t().planTitle }}</title>
        <desc id="plot-desc">{{ description() }}</desc>

        <!-- Spielfläche mit 1-m-Raster -->
        <rect class="stage" [attr.x]="px(0)" [attr.y]="py(0)" [attr.width]="W * M" [attr.height]="D * M" rx="6" />
        @for (g of gridX; track g) {
          <line class="grid" [attr.x1]="px(g)" [attr.y1]="py(0)" [attr.x2]="px(g)" [attr.y2]="py(D)" />
        }
        @for (g of gridY; track g) {
          <line class="grid" [attr.x1]="px(0)" [attr.y1]="py(g)" [attr.x2]="px(W)" [attr.y2]="py(g)" />
        }
        <text class="dim" [attr.x]="px(W / 2)" [attr.y]="py(0) - 26" text-anchor="middle">{{ t().area }} {{ W }} × {{ D }} M</text>
        <text class="audience" [attr.x]="px(W / 2)" [attr.y]="py(D) + 50" text-anchor="middle">▼  {{ t().audience }}  ▼</text>

        @for (it of items; track it.id) {
          <g [class.hit]="it.hw" [attr.role]="it.hw ? 'button' : null" [attr.tabindex]="it.hw ? 0 : null"
             [attr.aria-label]="it.hw ? ct.t(it.label) + ' – ' + t().details : null"
             (click)="it.hw && open(it.hw)" (keydown.enter)="it.hw && open(it.hw)" (keydown.space)="it.hw && open(it.hw, $event)">
          @switch (it.typ) {
            @case ('drums') {
              <rect class="riser" [attr.x]="px(it.x - it.b! / 2)" [attr.y]="py(it.y - it.t! / 2)" [attr.width]="it.b! * M" [attr.height]="it.t! * M" rx="10" />
              <!-- Blick des Schlagzeugers zum Publikum: Bassdrum und Hocker hinten, Toms und Becken vorne -->
              <circle class="drum" [attr.cx]="px(it.x)" [attr.cy]="py(it.y - 0.1)" r="26" />
              <circle class="drum" [attr.cx]="px(it.x + 0.42)" [attr.cy]="py(it.y - 0.12)" r="15" />
              <circle class="drum" [attr.cx]="px(it.x + 0.18)" [attr.cy]="py(it.y + 0.18)" r="13" />
              <circle class="drum" [attr.cx]="px(it.x - 0.18)" [attr.cy]="py(it.y + 0.18)" r="13" />
              <circle class="drum" [attr.cx]="px(it.x - 0.45)" [attr.cy]="py(it.y - 0.1)" r="17" />
              <circle class="cymbal" [attr.cx]="px(it.x + 0.6)" [attr.cy]="py(it.y + 0.36)" r="20" />
              <circle class="cymbal" [attr.cx]="px(it.x - 0.6)" [attr.cy]="py(it.y + 0.36)" r="22" />
              <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y + it.t! / 2) - 8" text-anchor="middle">{{ ct.t(it.label) }}</text>
            }
            @case ('person') {
              <circle class="person" [attr.cx]="px(it.x)" [attr.cy]="py(it.y)" r="21" />
              <text class="initial" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 6" text-anchor="middle">{{ ct.t(it.label)[0] }}</text>
              @if (it.id !== 'matthias') {
                <text class="label" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 42" text-anchor="middle">{{ ct.t(it.label) }}</text>
                <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 58" text-anchor="middle">{{ ct.t(it.rolle) }}</text>
              }
            }
            @case ('amp') {
              <rect class="box" [attr.x]="px(it.x - it.b! / 2)" [attr.y]="py(it.y - it.t! / 2)" [attr.width]="it.b! * M" [attr.height]="it.t! * M" rx="4" />
              <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 4" text-anchor="middle">{{ t().bassAmp }}</text>
            }
            @case ('mixer') {
              <rect class="box" [attr.x]="px(it.x - it.b! / 2)" [attr.y]="py(it.y - it.t! / 2)" [attr.width]="it.b! * M" [attr.height]="it.t! * M" rx="4" />
              @for (f of [-0.22, -0.11, 0, 0.11, 0.22]; track f) {
                <line class="fader" [attr.x1]="px(it.x + f)" [attr.y1]="py(it.y - 0.1)" [attr.x2]="px(it.x + f)" [attr.y2]="py(it.y + 0.14)" />
              }
              <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y - it.t! / 2) - 8" text-anchor="middle">{{ ct.t(it.label) }}</text>
            }
            @case ('monitor') {
              <g [attr.transform]="'rotate(' + (it.drehung ?? 0) + ' ' + px(it.x) + ' ' + py(it.y) + ')'">
                <polygon class="wedge" [attr.points]="wedge(it)" />
              </g>
              <text class="tiny" [attr.x]="px(it.x)" [attr.y]="py(it.y) + (it.drehung ? 44 : 30)" text-anchor="middle">{{ ct.t(it.label) }}</text>
            }
            @case ('pa') {
              <!-- Top, ggf. auf dem Subwoofer („sub“: true) -->
              <rect class="pa" [attr.x]="px(it.x) - 24" [attr.y]="py(it.y) - 84" width="48" height="74" rx="4" />
              <circle class="cone" [attr.cx]="px(it.x)" [attr.cy]="py(it.y) - 64" r="10" />
              <circle class="cone" [attr.cx]="px(it.x)" [attr.cy]="py(it.y) - 33" r="15" />
              @if (it.sub) {
                <rect class="pa" [attr.x]="px(it.x) - 30" [attr.y]="py(it.y) - 6" width="60" height="62" rx="4" />
                <circle class="cone" [attr.cx]="px(it.x)" [attr.cy]="py(it.y) + 25" r="22" />
                <text class="tiny" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 72" text-anchor="middle">Sub</text>
              }
              <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y) - 94" text-anchor="middle">PA</text>
            }
            @case ('pedalboard') {
              <rect class="box" [attr.x]="px(it.x - it.b! / 2)" [attr.y]="py(it.y - it.t! / 2)" [attr.width]="it.b! * M" [attr.height]="it.t! * M" rx="3" />
              @for (f of [-0.13, 0, 0.13]; track f) {
                <rect class="pedal" [attr.x]="px(it.x + f) - 7" [attr.y]="py(it.y) - 7" width="14" height="14" rx="2" />
              }
              <text class="tiny" [attr.x]="px(it.x)" [attr.y]="py(it.y + it.t! / 2) + 14" text-anchor="middle">{{ ct.t(it.label) }}</text>
            }
            @case ('mikro') {
              <!-- Mikrofonständer von oben: Dreibein, beim Galgen mit Arm zum Musiker -->
              @for (a of [90, 210, 330]; track a) {
                <line class="mic" [attr.x1]="px(it.x)" [attr.y1]="py(it.y)" [attr.x2]="px(it.x) + leg(a, 'x')" [attr.y2]="py(it.y) + leg(a, 'y')" />
              }
              @if (it.arm) {
                <line class="mic" [attr.x1]="px(it.x)" [attr.y1]="py(it.y)" [attr.x2]="px(it.arm[0])" [attr.y2]="py(it.arm[1])" />
              }
              <circle class="mic" [attr.cx]="px(it.arm ? it.arm[0] : it.x)" [attr.cy]="py(it.arm ? it.arm[1] : it.y)" r="5" />
            }
            @case ('licht') {
              <circle class="light" [attr.cx]="px(it.x)" [attr.cy]="py(it.y)" r="14" />
              <circle class="light-core" [attr.cx]="px(it.x)" [attr.cy]="py(it.y)" r="6" />
            }
            @case ('strom') {
              <rect class="power" [attr.x]="px(it.x) - 15" [attr.y]="py(it.y) - 12" width="30" height="24" rx="4" />
              <text class="power-sym" [attr.x]="px(it.x)" [attr.y]="py(it.y) + 6" text-anchor="middle">⚡</text>
              <text class="small" [attr.x]="px(it.x)" [attr.y]="py(it.y) - 20" text-anchor="middle">{{ ct.t(it.label) }}</text>
            }
          }
          </g>
        }
      </svg>
      <figcaption>
        <span><i class="key person"></i> {{ t().legend.musician }}</span>
        <span><i class="key wedge"></i> {{ t().legend.monitor }}</span>
        <span><i class="key mic"></i> {{ t().legend.mic }}</span>
        <span><i class="key pa"></i> {{ t().legend.pa }}</span>
        <span><i class="key light"></i> {{ t().legend.light }}</span>
        <span><i class="key power"></i> {{ t().legend.socket }}</span>
        <span>{{ t().caption }}</span>
      </figcaption>
    </figure>

    <h4>{{ t().channels }}</h4>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>{{ t().head.channel }}</th><th>{{ t().head.source }}</th><th>{{ t().head.type }}</th><th>{{ t().head.device }}</th><th>{{ t().head.stand }}</th><th>48 V</th></tr>
        </thead>
        <tbody>
          @for (k of kanaele; track k.kanal) {
            <tr>
              <td class="num">{{ k.kanal }}</td>
              <td>{{ ct.t(k.quelle) }}</td>
              <td>{{ ct.t(k.art) }}</td>
              <td [class.open]="!k.geraet">{{ k.geraet ? ct.t(k.geraet) : t().open }}</td>
              <td [class.open]="!k.stativ">{{ k.stativ ? ct.t(k.stativ) : '–' }}</td>
              <td>{{ k.phantom ? t().yes : '–' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <h4>{{ t().flow }}</h4>
    <div class="flow">
      <div class="col">
        <span class="col-title">{{ t().sources }}</span>
        @for (k of kanaele; track k.kanal) {
          <span class="chip"><b>{{ k.kanal }}</b> {{ ct.t(k.quelle) }}</span>
        }
      </div>
      <mat-icon class="arrow">arrow_forward</mat-icon>
      <div class="col center">
        <span class="col-title">{{ t().mixer }}</span>
        <button type="button" class="chip strong" [class.open]="!hardware['mischpult'].modell" (click)="open('mischpult')">
          {{ hardware['mischpult'].modell ?? t().modelOpen }}
        </button>
      </div>
      <mat-icon class="arrow">arrow_forward</mat-icon>
      <div class="col">
        <span class="col-title">{{ t().outputs }}</span>
        <span class="chip">{{ t().main }}</span>
        @for (m of monitore; track m.id) {
          <span class="chip">Aux {{ $index + 1 }} → {{ label(m.id) }} ({{ ct.t(m.fuer) }})</span>
        }
      </div>
    </div>

    <div class="two">
      <div>
        <h4>{{ t().devices }}</h4>
        <ul class="list">
          @for (g of geraeteListe; track g.key) {
            <li>
              <button type="button" class="hw-link" (click)="open(g.key)">
                <b>{{ ct.t(g.hw.kategorie) }}:</b> <span [class.open]="!g.hw.modell">{{ g.hw.modell ?? t().modelFollows }}</span>
                <mat-icon>info</mat-icon>
              </button>
            </li>
          }
        </ul>
      </div>
      <div>
        <h4>{{ t().monitors }}</h4>
        <ul class="list">
          @for (m of monitore; track m.id) {
            <li><b>{{ label(m.id) }}</b> {{ t().for }} {{ ct.t(m.fuer) }}: <span [class.open]="!m.mix">{{ m.mix ? ct.t(m.mix) : t().mixOpen }}</span></li>
          }
        </ul>
      </div>
      <div>
        <h4>{{ t().power }}</h4>
        <ul class="list">
          @for (s of strom; track s.id) {
            <li><b>{{ label(s.id) }}:</b> {{ verbraucher(s.verbraucher) }}</li>
          }
        </ul>
      </div>
    </div>
    <app-uebersetzung-hinweis [status]="contentStatus()" />
    <p class="stand">{{ t().asOf }} {{ i18n.date(stand, 'short') }}</p>

    <app-hardware-dialog />
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
    .drum, .box, .pa, .wedge, .power { fill: #22262b; stroke: var(--bn-ink); stroke-width: 1.5; }
    .wedge { fill: #2c3238; }
    .cymbal { fill: rgba(232, 164, 106, .12); stroke: var(--bn-sunset); stroke-width: 1.2; }
    .person { fill: var(--bn-sunset); }
    .initial { fill: #2a1708; font-size: 17px; font-weight: 700; }
    .label { fill: var(--bn-ink); font-size: 14px; font-weight: 600; }
    .small { fill: var(--bn-fog); font-size: 12px; }
    .tiny { fill: var(--bn-fog); font-size: 11px; }
    .fader, .pedal { stroke: var(--bn-sunset); stroke-width: 2; }
    .pedal { fill: none; stroke-width: 1.2; }
    .cone { fill: none; stroke: var(--bn-fog); stroke-width: 1.5; }
    .light { fill: rgba(255, 220, 150, .15); stroke: #f5d48f; stroke-width: 1.5; }
    .light-core, .key.light { fill: #f5d48f; background: #f5d48f; }
    .power { stroke: #7fc29b; }
    .power-sym { font-size: 14px; fill: #7fc29b; }
    figcaption { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 18px; margin-top: 12px; font-size: .8rem; color: var(--bn-fog); }
    figcaption span { display: inline-flex; align-items: center; gap: 6px; }
    .key { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }
    .key.person { background: var(--bn-sunset); border-radius: 50%; }
    .key.wedge, .key.pa { background: #22262b; border: 1px solid var(--bn-ink); }
    .mic, .key.mic { fill: var(--bn-ink); stroke: var(--bn-ink); background: var(--bn-ink); }
    .key.light, .key.mic { border-radius: 50%; }
    .key.power { border: 1px solid #7fc29b; }
    .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--bn-line); }
    table { width: 100%; border-collapse: collapse; font-size: .92rem; }
    th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--bn-line); white-space: nowrap; }
    th, .col-title { font-family: var(--bn-wide); font-weight: 400; font-size: .7rem; letter-spacing: .12em; text-transform: uppercase; color: var(--bn-fog); }
    tbody tr:last-child td { border-bottom: 0; }
    .num { color: var(--bn-sunset); font-variant-numeric: tabular-nums; width: 3em; }
    .open { color: var(--bn-fog); font-style: italic; }
    .flow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .col { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 200px; }
    .col.center { flex: 0 1 180px; min-width: 160px; }
    .chip { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--bn-line); font-size: .88rem; }
    .chip b { color: var(--bn-sunset); margin-right: 6px; font-variant-numeric: tabular-nums; }
    .chip.strong { padding: 18px 12px; text-align: center; border-color: var(--bn-sunset); }
    .arrow { color: var(--bn-sunset); }
    .two { display: grid; gap: 0 32px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .list { margin: 0; padding-left: 18px; line-height: 1.8; }
    .hit { cursor: pointer; outline: none; }
    .hit:hover > *, .hit:focus-visible > * { stroke: var(--bn-sunset); }
    .hit:hover text, .hit:focus-visible text { fill: var(--bn-sunset); stroke: none; }
    button.chip { font: inherit; color: inherit; background: transparent; cursor: pointer; }
    .hw-link {
      display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; color: inherit;
      font: inherit; text-align: left; cursor: pointer;
    }
    .hw-link mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--bn-fog); }
    button.chip:hover, .hw-link:hover, .hw-link:hover mat-icon { color: var(--bn-sunset); }
    .stand { margin: 20px 0 0; font-size: .78rem; color: var(--bn-fog); }
    @media (max-width: 700px) { .flow { flex-direction: column; align-items: stretch; } .arrow { transform: rotate(90deg); align-self: center; } }
  `,
})
export class TechnikAufbau {
  protected readonly status = data.status;
  protected readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t(TEXT);
  protected readonly ct = inject(Content);
  protected readonly stand = `${data.stand}T12:00:00`;
  protected readonly items = data.aufbau as Item[];
  protected readonly kanaele = data.kanaele;
  protected readonly monitore = data.monitore;
  protected readonly strom = data.strom;
  protected readonly hardware = HARDWARE;

  protected readonly geraeteListe = Object.entries(HARDWARE)
    .filter(([key]) => !key.startsWith('setup-'))
    .map(([key, hw]) => ({ key, hw }));

  protected readonly W = W;
  protected readonly D = D;
  protected readonly M = M;
  protected readonly px = px;
  protected readonly py = py;
  protected readonly gridX = Array.from({ length: W - 1 }, (_, i) => i + 1);
  protected readonly gridY = Array.from({ length: D - 1 }, (_, i) => i + 1);
  protected readonly viewBox = `0 0 ${2 * PAD_X + W * M} ${PAD_TOP + D * M + 70}`;
  protected readonly description = computed(
    () =>
      `${this.t().descArea} ${W} × ${D} m. ` +
      this.items.map((i) => `${this.ct.t(i.label)}${i.rolle ? ` (${this.ct.t(i.rolle)})` : ''}`).join(', ') +
      '.',
  );

  // alle Texte aus technik.json, die übersetzt angezeigt werden – für den Hinweis „noch nicht gegengelesen“
  protected readonly contentStatus = computed(() =>
    this.ct.status(
      data.status,
      ...this.items.flatMap((i) => [i.label, i.rolle]),
      ...this.kanaele.flatMap((k) => [k.quelle, k.art, k.geraet ?? undefined, k.stativ ?? undefined]),
      ...this.monitore.flatMap((m) => [m.fuer, m.mix ?? undefined]),
      ...this.strom.flatMap((s) => s.verbraucher),
      ...Object.values(HARDWARE).map((h) => h.kategorie),
    ),
  );

  private readonly dialog = viewChild.required(HardwareDialog);

  protected open(key: string, event?: Event): void {
    event?.preventDefault();
    const hw = HARDWARE[key];
    if (!hw) return;
    // beim Setup eines Musikers wäre „Im Bühnenplan: David“ doppelt – dort keine Ortsangabe
    if (key.startsWith('setup-')) this.dialog().show({ ...hw, extra: this.setup(key.slice('setup-'.length)) }, []);
    else this.dialog().show(hw, this.items.filter((i) => i.hw === key).map((i) => this.ct.t(i.label)));
  }

  // Setup-Zeilen eines Musikers aus Kanalliste, Geräten und Monitoren (bereits übersetzt)
  private setup(musiker: string): string[][] {
    const t = this.t();
    const kanaele = this.kanaele
      .filter((k) => k.musiker === musiker)
      .map((k) => [
        this.ct.t(k.quelle),
        [k.art === 'DI' ? 'DI' : k.geraet ? this.ct.t(k.geraet) : t.modelFollows, `${t.head.channel} ${k.kanal}`, k.stativ && `${t.head.stand}: ${this.ct.t(k.stativ)}`]
          .filter(Boolean)
          .join(' · '),
      ]);
    const geraete = this.items
      .filter((i) => i.musiker === musiker && i.hw && HARDWARE[i.hw])
      .map((i) => [this.ct.t(HARDWARE[i.hw!].kategorie), HARDWARE[i.hw!].modell ?? t.modelFollows]);
    const monitor = this.monitore
      .filter((m) => m.musiker === musiker)
      .map((m) => [this.ct.t('Monitor'), [this.label(m.id), `Aux ${this.monitore.indexOf(m) + 1}`, m.mix && this.ct.t(m.mix)].filter(Boolean).join(' · ')]);
    return [...kanaele, ...geraete, ...monitor];
  }

  protected label(id: string): string {
    const label = this.items.find((i) => i.id === id)?.label;
    return label ? this.ct.t(label) : id;
  }

  protected verbraucher(list: string[]): string {
    return list.map((v) => this.ct.t(v)).join(', ');
  }

  // Bein des Mikrofonstativs (Dreibein, 12 px lang) in Richtung a Grad
  protected leg(a: number, axis: 'x' | 'y'): number {
    const r = (a * Math.PI) / 180;
    return 12 * (axis === 'x' ? Math.cos(r) : -Math.sin(r));
  }

  // Monitorkeil: Trapez, die schmale Seite zeigt zum Musiker (nach oben = Richtung Bühnenrückseite)
  protected wedge(it: Item): string {
    const x = px(it.x), y = py(it.y);
    return [[x - 26, y + 14], [x + 26, y + 14], [x + 20, y - 10], [x - 20, y - 10]].map((p) => p.join(',')).join(' ');
  }
}
