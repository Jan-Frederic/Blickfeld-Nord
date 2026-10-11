import { Component } from '@angular/core';

@Component({
  selector: 'app-impressum',
  template: `
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

      <h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
      <p>
        Matthias Wigger<br />
        Am Wegehaspel 8<br />
        46499 Hamminkeln
      </p>
    </article>
  `,
})
export class Impressum {}
