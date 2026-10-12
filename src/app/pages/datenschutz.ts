import { Component } from '@angular/core';

@Component({
  selector: 'app-datenschutz',
  template: `
    <article class="section legal">
      <p class="kicker">Rechtliches</p>
      <h2>Datenschutzerklärung</h2>

      <h3>1. Allgemeine Hinweise</h3>
      <p>
        Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. Personenbezogene Daten werden auf
        dieser Website ausschließlich im Rahmen der gesetzlichen Vorschriften der Datenschutz-Grundverordnung
        (DSGVO) sowie des Bundesdatenschutzgesetzes (BDSG) verarbeitet.
      </p>
      <p>
        Diese Datenschutzerklärung informiert Sie darüber, welche Daten beim Besuch dieser Website erhoben werden
        und wie sie genutzt werden.
      </p>

      <h3>2. Verantwortlicher</h3>
      <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
      <p>
        Matthias Wigger (für die Band Blickfeld Nord)<br />
        Am Wegehaspel 8<br />
        46499 Hamminkeln<br />
        E-Mail: <a href="mailto:Matthiaswigger@me.com">Matthiaswigger&#64;me.com</a><br />
        Telefon: <a href="tel:+4915159092748">0151 59092748</a>
      </p>

      <h3>3. Hosting und Server-Logfiles</h3>
      <p>
        Diese Website wird über GitHub Pages bereitgestellt. Anbieter ist die GitHub Inc., 88 Colin P. Kelly Jr.
        Street, San Francisco, CA 94107, USA.
      </p>
      <p>
        Beim Aufruf der Website erfasst der Server von GitHub automatisch Informationen, die technisch erforderlich
        sind, um die Website auszuliefern und die Sicherheit des Dienstes zu gewährleisten. Dazu gehören
        insbesondere:
      </p>
      <ul>
        <li>IP-Adresse</li>
        <li>Datum und Uhrzeit des Zugriffs</li>
        <li>Browsertyp und -version</li>
        <li>verwendetes Betriebssystem</li>
        <li>aufgerufene Seiten</li>
      </ul>
      <p>
        Wir selbst haben keinen Zugriff auf diese Daten und nutzen sie nicht, um Sie persönlich zu identifizieren.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in der sicheren und
        zuverlässigen Bereitstellung der Website.
      </p>
      <p>
        Dabei können Daten in die USA übermittelt werden. GitHub ist unter dem EU-US Data Privacy Framework
        zertifiziert, für das die EU-Kommission einen Angemessenheitsbeschluss erlassen hat (Art. 45 DSGVO).
        Weitere Informationen finden Sie in der
        <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">Datenschutzerklärung von GitHub</a>.
      </p>

      <h3>4. Kontaktaufnahme per E-Mail oder Telefon</h3>
      <p>
        Wenn Sie uns per E-Mail oder telefonisch kontaktieren, werden die von Ihnen übermittelten Daten
        (z. B. Name, Telefonnummer, E-Mail-Adresse, Nachricht) ausschließlich zur Bearbeitung Ihrer Anfrage
        verwendet. Eine Weitergabe dieser Daten an Dritte erfolgt nicht.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit einem Vertrag (z. B. einer
        Booking-Anfrage) zusammenhängt, im Übrigen Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
        Beantwortung von Anfragen).
      </p>

      <h3>5. Schriftarten</h3>
      <p>
        Die auf dieser Website verwendeten Schriftarten und Icons sind lokal eingebunden. Beim Aufruf der Seite
        wird keine Verbindung zu Servern von Google oder anderen Drittanbietern hergestellt.
      </p>

      <h3>6. Externe Links</h3>
      <p>
        Auf dieser Website befinden sich Links zu unserem Profil auf Instagram (Meta Platforms Ireland Limited) sowie
        zu Google Maps (Google Ireland Limited) für die Anfahrt zu unseren Konzerten sowie zu befreundeten Websites
        (siehe „Freunde &amp; Partner“). Es handelt sich um einfache
        Verlinkungen – Inhalte dieser Anbieter sind nicht eingebettet. Erst wenn Sie einen Link anklicken, werden
        Sie auf die Seite des jeweiligen Anbieters weitergeleitet; ab dann gelten dessen Datenschutzbestimmungen.
      </p>

      <h3>7. Cookies</h3>
      <p>Diese Website verwendet keine Cookies und keine Analyse- oder Tracking-Werkzeuge.</p>

      <h3>8. Ihre Rechte</h3>
      <p>Sie haben jederzeit das Recht:</p>
      <ul>
        <li>Auskunft über Ihre gespeicherten Daten zu erhalten</li>
        <li>Berichtigung unrichtiger Daten zu verlangen</li>
        <li>Löschung Ihrer Daten zu verlangen</li>
        <li>Einschränkung der Verarbeitung zu verlangen</li>
        <li>Widerspruch gegen die Verarbeitung einzulegen</li>
        <li>Datenübertragbarkeit zu verlangen</li>
      </ul>
      <p>Bitte wenden Sie sich hierzu an die oben genannte verantwortliche Stelle.</p>

      <h3>9. Beschwerderecht bei der Aufsichtsbehörde</h3>
      <p>
        Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist die
        Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW),
        Kavalleriestraße 2–4, 40213 Düsseldorf.
      </p>

      <h3>10. Aktualität und Änderung dieser Datenschutzerklärung</h3>
      <p>
        Diese Datenschutzerklärung ist aktuell gültig und hat den Stand Oktober 2026. Durch Weiterentwicklung der
        Website oder gesetzliche Änderungen kann eine Anpassung erforderlich werden.
      </p>
    </article>
  `,
})
export class Datenschutz {}
