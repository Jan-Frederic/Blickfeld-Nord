import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageLinks } from '../sections/page-links';

// Technik-Seite für Veranstalter – im Footer, in den Booking-FAQ und über die Link-Leiste von Booking/Pressekit verlinkt.
// Angaben bitte gleich halten mit dem Technik-Rider (scripts/build-rider.py) und den FAQ (src/app/sections/booking.ts).
@Component({
  selector: 'app-technik',
  imports: [RouterLink, MatIconModule, PageLinks],
  template: `
    <section class="section">
      <p class="kicker">Für Veranstalter</p>
      <h2>Technik</h2>
      <p class="lead">
        Ihr kümmert euch um die Gäste, wir um den Sound: PA, Licht und Instrumente bringen wir selbst mit.
        Von euch brauchen wir nur ein bisschen Platz und Strom – hier sind alle Details auf einen Blick.
      </p>

      <app-page-links current="technik" />

      <div class="downloads">
        <a class="btn primary" href="presse/blickfeld-nord-technik-rider.pdf" download>
          <mat-icon>description</mat-icon> Technik-Rider (PDF)
        </a>
      </div>

      <h3>Was wir mitbringen</h3>
      <div class="cards">
        <div class="card">
          <mat-icon>speaker</mat-icon>
          <h4>PA</h4>
          <ul>
            <li>Lautsprecher (Tops) und Subwoofer</li>
            <li>Mischpult</li>
            <li>Drei Gesangsmikrofone und Drum-Mikrofone</li>
            <li>Monitorboxen</li>
          </ul>
        </div>
        <div class="card">
          <mat-icon>lightbulb</mat-icon>
          <h4>Licht</h4>
          <ul>
            <li>PAR-Scheinwerfer</li>
            <li>Lichtstativ bzw. Lichtbrücke</li>
            <li>Lichtsteuerung</li>
            <li>Nebelmaschine</li>
          </ul>
        </div>
        <div class="card">
          <mat-icon>queue_music</mat-icon>
          <h4>Instrumente</h4>
          <ul>
            <li>Akustikgitarre</li>
            <li>E-Bass mit Verstärker</li>
            <li>Schlagzeug</li>
            <li>Kabel, Ständer und Mehrfachsteckdosen</li>
          </ul>
        </div>
      </div>

      <h3>Was wir von euch brauchen</h3>
      <ul class="facts">
        <li>
          <mat-icon>straighten</mat-icon>
          <span class="label">Spielfläche</span>
          <span class="value">ca. 4 × 3 Meter</span>
        </li>
        <li>
          <mat-icon>power</mat-icon>
          <span class="label">Strom</span>
          <span class="value">2 Steckdosen in der Nähe der Spielfläche</span>
        </li>
      </ul>

      <h3>Zeitplan</h3>
      <ol class="timeline">
        <li><span class="time">ca. 3 Std. vorher</span><span>Ankunft und Aufbau</span></li>
        <li><span class="time">3 bis 4 Std.</span><span>Spielzeit in Sets à 1 Stunde – Pausen nach Absprache oder spontan</span></li>
        <li><span class="time">ca. 1 Std.</span><span>Abbau nach dem letzten Song</span></li>
      </ol>

      <p class="note">
        <mat-icon>info</mat-icon>
        <span>
          Noch Fragen zur Technik oder besondere Gegebenheiten vor Ort? Meldet euch gern über die
          <a routerLink="/booking">Booking-Seite</a> – wir finden eine Lösung.
        </span>
      </p>
    </section>
  `,
  styles: `
    h3 {
      font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase;
      letter-spacing: .08em; margin: 40px 0 16px;
    }
    .downloads { display: flex; flex-wrap: wrap; gap: 12px; }
    .btn {
      display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px;
      border: 1px solid var(--bn-line); color: var(--bn-ink); text-decoration: none; font-weight: 500;
      transition: border-color .2s, color .2s, background .2s;
    }
    .btn:hover { border-color: var(--bn-sunset); color: var(--bn-sunset); }
    .btn.primary { background: var(--bn-sunset); border-color: var(--bn-sunset); color: #2a1708; }
    .btn.primary:hover { background: #f0b884; color: #2a1708; }
    .btn mat-icon { width: 20px; height: 20px; font-size: 20px; flex: none; }
    .cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .card { padding: 20px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72); }
    .card mat-icon { color: var(--bn-sunset); }
    h4 { margin: 10px 0 10px; font-family: var(--bn-wide); font-weight: 400; font-size: .8rem; text-transform: uppercase; letter-spacing: .14em; }
    .card ul { margin: 0; padding-left: 18px; line-height: 1.7; color: rgba(236, 233, 228, .86); }
    .facts { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .facts li {
      display: grid; grid-template-columns: auto 1fr; column-gap: 12px; align-items: center;
      padding: 16px 18px; border-radius: 12px; border: 1px solid var(--bn-line); background: rgba(27, 30, 34, .72);
    }
    .facts mat-icon { grid-row: span 2; color: var(--bn-sunset); }
    .label { font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .14em; font-size: .68rem; color: var(--bn-fog); }
    .value { line-height: 1.5; }
    .timeline { list-style: none; padding: 0; margin: 0; border-left: 1px solid var(--bn-line); }
    .timeline li { position: relative; display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 0 0 18px 22px; line-height: 1.55; }
    .timeline li::before {
      content: ''; position: absolute; left: -5px; top: 7px; width: 9px; height: 9px; border-radius: 50%; background: var(--bn-sunset);
    }
    .time { min-width: 140px; font-family: var(--bn-wide); text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; color: var(--bn-sunset); padding-top: 3px; }
    .note {
      display: flex; gap: 10px; align-items: flex-start; margin: 32px 0 0; padding: 14px 16px; border-radius: 10px;
      background: rgba(232, 164, 106, .08); border: 1px solid rgba(232, 164, 106, .3); line-height: 1.55; color: rgba(236, 233, 228, .86);
    }
    .note mat-icon { flex: none; color: var(--bn-sunset); }
    .note a { color: var(--bn-sunset); }
  `,
})
export class Technik {}
