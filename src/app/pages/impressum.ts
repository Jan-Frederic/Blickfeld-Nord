import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../i18n';

@Component({
  selector: 'app-impressum',
  imports: [RouterLink],
  template: `
    @switch (lang()) {
      @case ('en') {
        <article class="section legal" lang="en">
          <p class="kicker">Legal</p>
          <h2>Legal notice</h2>
          <p class="binding">
            This is a translation for convenience. Only the German version is legally binding:
            <a routerLink="/impressum" lang="de" hreflang="de">Impressum (Deutsch)</a>
          </p>

          <h3>Information pursuant to § 5 DDG (German Digital Services Act)</h3>
          <p>
            Blickfeld Nord<br />
            represented by Matthias Wigger<br />
            Am Wegehaspel 8<br />
            46499 Hamminkeln<br />
            Germany
          </p>

          <h3>Contact</h3>
          <p>
            Phone: <a href="tel:+4915159092748">+49 151 59092748</a><br />
            E-mail: <a href="mailto:Matthiaswigger@me.com">Matthiaswigger&#64;me.com</a>
          </p>

          <h3>Tax information</h3>
          <p>
            Tax number: 130/5026/2980<br />
            Business identification number pursuant to § 139c AO (German Fiscal Code): DE400195544
          </p>

          <h3>Responsible for the content pursuant to § 18(2) MStV (German Interstate Media Treaty)</h3>
          <p>
            Matthias Wigger<br />
            Am Wegehaspel 8<br />
            46499 Hamminkeln<br />
            Germany
          </p>
        </article>
      }
      @case ('nl') {
        <article class="section legal" lang="nl">
          <p class="kicker">Juridisch</p>
          <h2>Colofon</h2>
          <p class="binding">
            Dit is een vertaling voor het gemak. Alleen de Duitse versie is juridisch bindend:
            <a routerLink="/impressum" lang="de" hreflang="de">Impressum (Duits)</a>
          </p>

          <h3>Gegevens volgens § 5 DDG (Duitse wet op digitale diensten)</h3>
          <p>
            Blickfeld Nord<br />
            vertegenwoordigd door Matthias Wigger<br />
            Am Wegehaspel 8<br />
            46499 Hamminkeln<br />
            Duitsland
          </p>

          <h3>Contact</h3>
          <p>
            Telefoon: <a href="tel:+4915159092748">+49 151 59092748</a><br />
            E-mail: <a href="mailto:Matthiaswigger@me.com">Matthiaswigger&#64;me.com</a>
          </p>

          <h3>Fiscale gegevens</h3>
          <p>
            Belastingnummer: 130/5026/2980<br />
            Bedrijfsidentificatienummer volgens § 139c AO (Duitse belastingwet): DE400195544
          </p>

          <h3>Verantwoordelijk voor de inhoud volgens § 18 lid 2 MStV (Duits mediaverdrag)</h3>
          <p>
            Matthias Wigger<br />
            Am Wegehaspel 8<br />
            46499 Hamminkeln<br />
            Duitsland
          </p>
        </article>
      }
      @default {
        <article class="section legal">
          <p class="kicker">Rechtliches</p>
          <h2>Impressum</h2>

          <h3>Angaben gemäß § 5 DDG</h3>
          <p>
            Blickfeld Nord<br />
            vertreten durch Matthias Wigger<br />
            Am Wegehaspel 8<br />
            46499 Hamminkeln
          </p>

          <h3>Kontakt</h3>
          <p>
            Telefon: <a href="tel:+4915159092748">0151 59092748</a><br />
            E-Mail: <a href="mailto:Matthiaswigger@me.com">Matthiaswigger&#64;me.com</a>
          </p>

          <h3>Steuerangaben</h3>
          <p>
            Steuernummer: 130/5026/2980<br />
            Wirtschafts-Identifikationsnummer gemäß § 139c AO: DE400195544
          </p>

          <h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
          <p>
            Matthias Wigger<br />
            Am Wegehaspel 8<br />
            46499 Hamminkeln
          </p>
        </article>
      }
    }
  `,
  styles: `.binding { padding: 12px 16px; border-left: 3px solid var(--bn-sunset); background: rgba(255, 255, 255, .04); }`,
})
export class Impressum {
  // Übersetzungen nur zur Orientierung – verbindlich ist die deutsche Fassung
  protected readonly lang = inject(I18n).lang;
}
