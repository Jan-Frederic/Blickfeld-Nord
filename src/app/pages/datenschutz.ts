import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../i18n';

@Component({
  selector: 'app-datenschutz',
  imports: [RouterLink],
  template: `
    @switch (lang()) {
      @case ('en') {
        <article class="section legal" lang="en">
          <p class="kicker">Legal</p>
          <h2>Privacy policy</h2>
          <p class="binding">
            This is a translation for convenience. Only the German version is legally binding:
            <a routerLink="/datenschutz" lang="de" hreflang="de">Datenschutzerklärung (Deutsch)</a>
          </p>

          <h3>1. General information</h3>
          <p>
            The protection of your personal data is important to us. Personal data is processed on this website
            exclusively within the framework of the statutory provisions of the General Data Protection Regulation
            (GDPR) and the German Federal Data Protection Act (BDSG).
          </p>
          <p>
            This privacy policy informs you about which data is collected when you visit this website and how it is
            used.
          </p>

          <h3>2. Controller</h3>
          <p>The controller responsible for data processing on this website is:</p>
          <p>
            Matthias Wigger (for the band Blickfeld Nord)<br />
            Am Wegehaspel 8<br />
            46499 Hamminkeln<br />
            Germany<br />
            E-mail: <a href="mailto:Matthiaswigger@me.com">Matthiaswigger&#64;me.com</a><br />
            Phone: <a href="tel:+4915159092748">+49 151 59092748</a>
          </p>

          <h3>3. Hosting and server log files</h3>
          <p>
            This website is provided via GitHub Pages. The provider is GitHub Inc., 88 Colin P. Kelly Jr. Street,
            San Francisco, CA 94107, USA.
          </p>
          <p>
            When the website is accessed, GitHub's server automatically collects information that is technically
            necessary to deliver the website and to ensure the security of the service. This includes in particular:
          </p>
          <ul>
            <li>IP address</li>
            <li>date and time of access</li>
            <li>browser type and version</li>
            <li>operating system used</li>
            <li>pages accessed</li>
          </ul>
          <p>
            We ourselves have no access to this data and do not use it to identify you personally. The legal basis is
            Art. 6(1)(f) GDPR; our legitimate interest lies in the secure and reliable provision of the website.
          </p>
          <p>
            In the process, data may be transferred to the USA. GitHub is certified under the EU-US Data Privacy
            Framework, for which the EU Commission has adopted an adequacy decision (Art. 45 GDPR). Further information
            can be found in
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub's privacy statement</a>.
          </p>

          <h3>4. Contacting us by e-mail or phone</h3>
          <p>
            If you contact us by e-mail or phone, the data you provide (e.g. name, phone number, e-mail address,
            message) will be used exclusively to process your enquiry. This data will not be passed on to third
            parties.
          </p>
          <p>
            The legal basis is Art. 6(1)(b) GDPR insofar as your enquiry is related to a contract (e.g. a booking
            enquiry), and otherwise Art. 6(1)(f) GDPR (legitimate interest in responding to enquiries).
          </p>

          <h3>5. Fonts and offline storage</h3>
          <p>
            The fonts and icons used on this website are embedded locally. No connection to servers of Google or other
            third-party providers is established for fonts and icons.
          </p>
          <p>
            So that the website also works without an internet connection and can be installed as an app on the home
            screen, your browser stores files of this website (pages, scripts, fonts and images viewed) in its own cache
            (service worker). No personal data is collected in the process and nothing is transmitted to us or to third
            parties. You can delete this storage at any time via your browser settings ("site data").
          </p>

          <h3>6. External links</h3>
          <p>
            This website contains links to our profiles on Instagram and Facebook (both Meta Platforms Ireland Limited),
            to our repertoire playlist on Spotify (Spotify AB), to Google Maps (Google Ireland Limited) for directions to
            our concerts and to websites of friends (see "Friends &amp; partners"). These are simple links. Only when you
            click on a link will you be redirected to the website of the respective provider; from then on, its privacy
            policy applies.
          </p>

          <h3>7. Embedded Instagram content (two-click solution)</h3>
          <p>
            Videos (reels) on the "History" page and posts on the home page may be embedded from Instagram. The provider
            is Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Ireland. To protect your data, only a
            placeholder is shown at first – no connection to Instagram is established. Only when you click on "Load reel"
            or "Load posts" is the content loaded from Meta's servers. In particular, your IP address, information about
            your browser and device and the page accessed are transmitted to Meta; Meta may also set cookies and, if you
            are logged in to Instagram, assign the access to your account. A transfer to the USA is possible; Meta is
            certified under the EU-US Data Privacy Framework.
          </p>
          <p>
            The legal basis is your consent given by clicking (Art. 6(1)(a) GDPR, § 25(1) TDDDG – German
            Telecommunications Digital Services Data Protection Act). The consent applies only to the respective page
            view; after the page is reloaded, the placeholder is shown again. Alternatively, you can watch the video
            directly on Instagram. Further information:
            <a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noopener">Instagram's privacy policy</a>.
          </p>

          <h3>8. Audience measurement with GoatCounter</h3>
          <p>
            To find out how often our pages are accessed, we use the analytics service GoatCounter (goatcounter.com).
            When a page is accessed, the page accessed, the referring page (referrer), browser and operating system, the
            screen size and the country derived from the IP address are transmitted. GoatCounter does not set cookies,
            does not store anything on your device and does not store your IP address; to recognise a visit, only an
            encrypted value (hash) of the IP address and browser identifier is kept in memory for a maximum of 8 hours.
            We only see aggregated figures; we are unable to attribute them to individual persons. These totals (number
            of views per page and in total) are also publicly retrievable via GoatCounter; they contain no information
            about individual visitors.
          </p>
          <p>
            The legal basis is our legitimate interest in a data-minimising analysis of the use of our website
            (Art. 6(1)(f) GDPR). You can object to the collection by blocking JavaScript or the script from gc.zgo.at in
            your browser (e.g. with an ad blocker). Further information:
            <a href="https://www.goatcounter.com/privacy" target="_blank" rel="noopener">GoatCounter's privacy policy</a>.
          </p>

          <h3>9. Cookies</h3>
          <p>
            This website does not use cookies – the audience measurement (section 8) also works without them. Cookies
            from Instagram can only be set if you actively load content from Instagram (see section 7).
          </p>

          <h3>10. Your rights</h3>
          <p>You have the right at any time:</p>
          <ul>
            <li>to obtain information about your stored data</li>
            <li>to request the rectification of inaccurate data</li>
            <li>to request the erasure of your data</li>
            <li>to request the restriction of processing</li>
            <li>to object to the processing</li>
            <li>to request data portability</li>
          </ul>
          <p>To do so, please contact the controller named above.</p>

          <h3>11. Right to lodge a complaint with the supervisory authority</h3>
          <p>
            You have the right to lodge a complaint with a data protection supervisory authority. The competent authority
            is the State Commissioner for Data Protection and Freedom of Information of North Rhine-Westphalia
            (LDI NRW), Kavalleriestraße 2–4, 40213 Düsseldorf, Germany.
          </p>

          <h3>12. Validity and changes to this privacy policy</h3>
          <p>
            This privacy policy is currently valid and is as of October 2026. Further development of the website or
            changes in the law may make it necessary to amend it.
          </p>
        </article>
      }
      @case ('nl') {
        <article class="section legal" lang="nl">
          <p class="kicker">Juridisch</p>
          <h2>Privacyverklaring</h2>
          <p class="binding">
            Dit is een vertaling voor het gemak. Alleen de Duitse versie is juridisch bindend:
            <a routerLink="/datenschutz" lang="de" hreflang="de">Datenschutzerklärung (Duits)</a>
          </p>

          <h3>1. Algemene informatie</h3>
          <p>
            De bescherming van uw persoonsgegevens is voor ons een belangrijk aandachtspunt. Persoonsgegevens worden op
            deze website uitsluitend verwerkt binnen het kader van de wettelijke bepalingen van de Algemene verordening
            gegevensbescherming (AVG) en de Duitse federale wet op de gegevensbescherming (BDSG).
          </p>
          <p>
            Deze privacyverklaring informeert u over welke gegevens bij een bezoek aan deze website worden verzameld en
            hoe ze worden gebruikt.
          </p>

          <h3>2. Verwerkingsverantwoordelijke</h3>
          <p>Verantwoordelijk voor de gegevensverwerking op deze website is:</p>
          <p>
            Matthias Wigger (voor de band Blickfeld Nord)<br />
            Am Wegehaspel 8<br />
            46499 Hamminkeln<br />
            Duitsland<br />
            E-mail: <a href="mailto:Matthiaswigger@me.com">Matthiaswigger&#64;me.com</a><br />
            Telefoon: <a href="tel:+4915159092748">+49 151 59092748</a>
          </p>

          <h3>3. Hosting en serverlogbestanden</h3>
          <p>
            Deze website wordt aangeboden via GitHub Pages. Aanbieder is GitHub Inc., 88 Colin P. Kelly Jr. Street,
            San Francisco, CA 94107, VS.
          </p>
          <p>
            Bij het openen van de website legt de server van GitHub automatisch informatie vast die technisch nodig is
            om de website te leveren en de veiligheid van de dienst te waarborgen. Daartoe behoren in het bijzonder:
          </p>
          <ul>
            <li>IP-adres</li>
            <li>datum en tijdstip van de toegang</li>
            <li>type en versie van de browser</li>
            <li>gebruikt besturingssysteem</li>
            <li>bezochte pagina's</li>
          </ul>
          <p>
            Wijzelf hebben geen toegang tot deze gegevens en gebruiken ze niet om u persoonlijk te identificeren. De
            rechtsgrondslag is art. 6 lid 1 sub f AVG; ons gerechtvaardigd belang ligt in het veilig en betrouwbaar
            aanbieden van de website.
          </p>
          <p>
            Daarbij kunnen gegevens naar de VS worden doorgegeven. GitHub is gecertificeerd onder het EU-US Data Privacy
            Framework, waarvoor de Europese Commissie een adequaatheidsbesluit heeft vastgesteld (art. 45 AVG). Meer
            informatie vindt u in de
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">privacyverklaring van GitHub</a>.
          </p>

          <h3>4. Contact per e-mail of telefoon</h3>
          <p>
            Als u per e-mail of telefonisch contact met ons opneemt, worden de door u verstrekte gegevens (bijv. naam,
            telefoonnummer, e-mailadres, bericht) uitsluitend gebruikt voor de afhandeling van uw verzoek. Deze gegevens
            worden niet aan derden doorgegeven.
          </p>
          <p>
            De rechtsgrondslag is art. 6 lid 1 sub b AVG, voor zover uw verzoek verband houdt met een overeenkomst (bijv.
            een boekingsaanvraag), en verder art. 6 lid 1 sub f AVG (gerechtvaardigd belang bij het beantwoorden van
            verzoeken).
          </p>

          <h3>5. Lettertypen en offline-opslag</h3>
          <p>
            De op deze website gebruikte lettertypen en iconen zijn lokaal ingebonden. Voor lettertypen en iconen wordt
            geen verbinding gemaakt met servers van Google of andere derde partijen.
          </p>
          <p>
            Zodat de website ook zonder internetverbinding werkt en als app op het beginscherm kan worden geïnstalleerd,
            slaat uw browser bestanden van deze website (pagina's, scripts, lettertypen en bekeken afbeeldingen) op in
            zijn eigen tijdelijke opslag (service worker). Daarbij worden geen persoonsgegevens verzameld en wordt niets
            aan ons of aan derden doorgegeven. U kunt deze opslag op elk moment via de instellingen van uw browser
            verwijderen („websitegegevens”).
          </p>

          <h3>6. Externe links</h3>
          <p>
            Op deze website staan links naar onze profielen op Instagram en Facebook (beide Meta Platforms Ireland
            Limited), naar onze repertoire-playlist op Spotify (Spotify AB), naar Google Maps (Google Ireland Limited)
            voor de routebeschrijving naar onze concerten en naar websites van vrienden (zie „Vrienden &amp; partners”).
            Het gaat om eenvoudige links. Pas wanneer u op een link klikt, wordt u doorgestuurd naar de website van de
            betreffende aanbieder; vanaf dat moment geldt diens privacybeleid.
          </p>

          <h3>7. Ingebedde Instagram-inhoud (tweeklikoplossing)</h3>
          <p>
            Op de pagina „Geschiedenis” kunnen video's (reels) en op de startpagina berichten van Instagram zijn
            ingebed. Aanbieder is Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Ierland. Ter
            bescherming van uw gegevens wordt eerst alleen een plaatshouder getoond – er wordt geen verbinding met
            Instagram gemaakt. Pas wanneer u op „Reel laden” of „Berichten laden” klikt, wordt de inhoud van de servers
            van Meta geladen. Daarbij worden in het bijzonder uw IP-adres, gegevens over browser en apparaat en de
            bezochte pagina aan Meta doorgegeven; Meta kan bovendien cookies plaatsen en, als u bij Instagram bent
            ingelogd, het bezoek aan uw account koppelen. Een doorgifte naar de VS is mogelijk; Meta is gecertificeerd
            onder het EU-US Data Privacy Framework.
          </p>
          <p>
            De rechtsgrondslag is uw toestemming door de klik (art. 6 lid 1 sub a AVG, § 25 lid 1 TDDDG – Duitse wet op
            de gegevensbescherming bij telecommunicatie en digitale diensten). De toestemming geldt alleen voor het
            betreffende paginabezoek; na het opnieuw laden van de pagina wordt weer de plaatshouder getoond. U kunt de
            video ook rechtstreeks op Instagram bekijken. Meer informatie:
            <a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noopener">privacybeleid van Instagram</a>.
          </p>

          <h3>8. Bereikmeting met GoatCounter</h3>
          <p>
            Om te weten hoe vaak onze pagina's worden bezocht, gebruiken we de statistiekdienst GoatCounter
            (goatcounter.com). Daarbij worden bij een paginabezoek de bezochte pagina, de verwijzende pagina (referrer),
            browser en besturingssysteem, de schermgrootte en het uit het IP-adres afgeleide land doorgegeven.
            GoatCounter plaatst geen cookies, slaat niets op uw apparaat op en slaat uw IP-adres niet op; om een bezoek
            te herkennen wordt alleen een versleutelde waarde (hash) van IP-adres en browserkenmerk maximaal 8 uur in het
            werkgeheugen bewaard. Wij zien uitsluitend samengevatte cijfers; een koppeling aan individuele personen is
            voor ons niet mogelijk. Deze totalen (aantal bezoeken per pagina en in totaal) zijn via GoatCounter ook
            openbaar op te vragen; ze bevatten geen gegevens over individuele bezoekers.
          </p>
          <p>
            De rechtsgrondslag is ons gerechtvaardigd belang bij een dataminimaliserende analyse van het gebruik van onze
            website (art. 6 lid 1 sub f AVG). U kunt bezwaar maken tegen de registratie door JavaScript of het script van
            gc.zgo.at in uw browser te blokkeren (bijv. met een adblocker). Meer informatie:
            <a href="https://www.goatcounter.com/privacy" target="_blank" rel="noopener">privacyverklaring van GoatCounter</a>.
          </p>

          <h3>9. Cookies</h3>
          <p>
            Deze website gebruikt geen cookies – ook de bereikmeting (punt 8) werkt zonder. Cookies van Instagram kunnen
            alleen worden geplaatst als u actief inhoud van Instagram laadt (zie punt 7).
          </p>

          <h3>10. Uw rechten</h3>
          <p>U hebt op elk moment het recht om:</p>
          <ul>
            <li>inzage te krijgen in uw opgeslagen gegevens</li>
            <li>rectificatie van onjuiste gegevens te verlangen</li>
            <li>wissing van uw gegevens te verlangen</li>
            <li>beperking van de verwerking te verlangen</li>
            <li>bezwaar te maken tegen de verwerking</li>
            <li>overdraagbaarheid van gegevens te verlangen</li>
          </ul>
          <p>Neem hiervoor contact op met de hierboven genoemde verwerkingsverantwoordelijke.</p>

          <h3>11. Recht om een klacht in te dienen bij de toezichthoudende autoriteit</h3>
          <p>
            U hebt het recht een klacht in te dienen bij een toezichthoudende autoriteit voor gegevensbescherming.
            Bevoegd is de Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW, de
            functionaris voor gegevensbescherming en vrijheid van informatie van Noordrijn-Westfalen),
            Kavalleriestraße 2–4, 40213 Düsseldorf, Duitsland.
          </p>

          <h3>12. Actualiteit en wijziging van deze privacyverklaring</h3>
          <p>
            Deze privacyverklaring is momenteel geldig en heeft de stand oktober 2026. Door verdere ontwikkeling van de
            website of wettelijke wijzigingen kan een aanpassing nodig worden.
          </p>
        </article>
      }
      @default {
        <article class="section legal">
          <p class="kicker">Rechtliches</p>
          <h2>Datenschutz</h2>

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

          <h3>5. Schriftarten und Offline-Speicher</h3>
          <p>
            Die auf dieser Website verwendeten Schriftarten und Icons sind lokal eingebunden. Für Schriftarten
            und Icons wird keine Verbindung zu Servern von Google oder anderen Drittanbietern hergestellt.
          </p>
          <p>
            Damit die Website auch ohne Internetverbindung funktioniert und als App auf dem Startbildschirm installiert
            werden kann, legt Ihr Browser Dateien dieser Website (Seiten, Skripte, Schriften und angesehene Bilder) in
            seinem eigenen Zwischenspeicher ab (Service Worker). Dabei werden keine personenbezogenen Daten erhoben und
            nichts an uns oder Dritte übertragen. Sie können diesen Speicher jederzeit über die Einstellungen Ihres Browsers
            löschen („Website-Daten“).
          </p>

          <h3>6. Externe Links</h3>
          <p>
            Auf dieser Website befinden sich Links zu unseren Profilen auf Instagram und Facebook (beide Meta Platforms
            Ireland Limited), zu unserer Repertoire-Playlist auf Spotify (Spotify AB) sowie
            zu Google Maps (Google Ireland Limited) für die Anfahrt zu unseren Konzerten sowie zu befreundeten Websites
            (siehe „Freunde &amp; Partner“). Es handelt sich um einfache
            Verlinkungen. Erst wenn Sie einen Link anklicken, werden
            Sie auf die Seite des jeweiligen Anbieters weitergeleitet; ab dann gelten dessen Datenschutzbestimmungen.
          </p>

          <h3>7. Eingebettete Instagram-Inhalte (Zwei-Klick-Lösung)</h3>
          <p>
            Auf der Seite „Historie“ können Videos (Reels) und auf der Startseite Beiträge von Instagram eingebunden sein.
            Anbieter ist die Meta Platforms
            Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irland. Zum Schutz Ihrer Daten wird dabei zunächst nur ein
            Platzhalter angezeigt – es wird keine Verbindung zu Instagram hergestellt. Erst wenn Sie auf „Reel laden“
            bzw. „Posts laden“ klicken, wird der Inhalt von den Servern von Meta geladen. Dabei werden insbesondere Ihre IP-Adresse, Angaben
            zu Browser und Gerät sowie die aufgerufene Seite an Meta übermittelt; Meta kann zudem Cookies setzen und,
            falls Sie bei Instagram angemeldet sind, den Aufruf Ihrem Konto zuordnen. Eine Übermittlung in die USA ist
            möglich; Meta ist nach dem EU-US Data Privacy Framework zertifiziert.
          </p>
          <p>
            Rechtsgrundlage ist Ihre Einwilligung durch den Klick (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Die
            Einwilligung gilt nur für den jeweiligen Seitenaufruf; nach dem Neuladen der Seite wird wieder der Platzhalter
            angezeigt. Alternativ können Sie das Video direkt auf Instagram ansehen. Weitere Informationen:
            <a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noopener">Datenschutzrichtlinie von Instagram</a>.
          </p>

          <h3>8. Reichweitenmessung mit GoatCounter</h3>
          <p>
            Um zu erfahren, wie oft unsere Seiten aufgerufen werden, nutzen wir den Statistikdienst GoatCounter
            (goatcounter.com). Dabei werden beim Seitenaufruf die aufgerufene Seite, die verweisende Seite (Referrer),
            Browser und Betriebssystem, die Bildschirmgröße sowie das aus der IP-Adresse abgeleitete Land übermittelt.
            GoatCounter setzt keine Cookies, speichert nichts auf Ihrem Gerät und speichert Ihre IP-Adresse nicht; zur
            Erkennung eines Besuchs wird lediglich ein verschlüsselter Wert (Hash) aus IP-Adresse und Browserkennung für
            höchstens 8 Stunden im Arbeitsspeicher gehalten. Wir sehen ausschließlich zusammengefasste Zahlen, eine
            Zuordnung zu einzelnen Personen ist uns nicht möglich. Diese Summen (Anzahl der Aufrufe je Seite und
            insgesamt) sind über GoatCounter auch öffentlich abrufbar; sie enthalten keine Angaben zu einzelnen Besuchern.
          </p>
          <p>
            Rechtsgrundlage ist unser berechtigtes Interesse an einer datensparsamen Auswertung der Nutzung unserer Website
            (Art. 6 Abs. 1 lit. f DSGVO). Sie können der Erfassung widersprechen, indem Sie JavaScript oder das Skript
            von gc.zgo.at in Ihrem Browser blockieren (z. B. mit einem Werbeblocker). Weitere Informationen:
            <a href="https://www.goatcounter.com/privacy" target="_blank" rel="noopener">Datenschutzerklärung von GoatCounter</a>.
          </p>

          <h3>9. Cookies</h3>
          <p>
            Diese Website verwendet keine Cookies – auch die Reichweitenmessung (Abschnitt 8) kommt ohne aus. Cookies von
            Instagram können nur gesetzt werden, wenn Sie Inhalte von Instagram aktiv laden (siehe Abschnitt 7).
          </p>

          <h3>10. Ihre Rechte</h3>
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

          <h3>11. Beschwerderecht bei der Aufsichtsbehörde</h3>
          <p>
            Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist die
            Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW),
            Kavalleriestraße 2–4, 40213 Düsseldorf.
          </p>

          <h3>12. Aktualität und Änderung dieser Datenschutzerklärung</h3>
          <p>
            Diese Datenschutzerklärung ist aktuell gültig und hat den Stand Oktober 2026. Durch Weiterentwicklung der
            Website oder gesetzliche Änderungen kann eine Anpassung erforderlich werden.
          </p>
        </article>
      }
    }
  `,
  styles: `.binding { padding: 12px 16px; border-left: 3px solid var(--bn-sunset); background: rgba(255, 255, 255, .04); }`,
})
export class Datenschutz {
  // Übersetzungen nur zur Orientierung – verbindlich ist die deutsche Fassung
  protected readonly lang = inject(I18n).lang;
}
