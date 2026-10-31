import { Component, DestroyRef, afterNextRender, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BandService } from '../data/band.service';
import { PageMetaService } from '../page-meta';
import { I18n, LDatePipe, LocPipe, tr } from '../i18n';
import { Content } from '../content';
import { kampagnenLink } from '../data/goatcounter';
import { postText, posterFileName, renderPoster } from '../data/poster';
import { schrittText } from '../data/werbeplan';
import repertoire from '../data/repertoire.json';

// Pressekit je Konzert (/presse/<id>): alles für den Veranstalter griffbereit – Eckdaten, Plakat und Story als Bild
// (im Browser gezeichnet, mit QR-Code zur Konzertseite), fertige Texte für Beitrag und Stories sowie die Songliste
// (Repertoire). Nur öffentliche, geklärte Konzerte; die Texte gibt es auf Deutsch. Nicht für Suchmaschinen (noindex),
// die Konzertseite selbst ist die öffentliche Seite.
const TEXT = tr(
  {
    back: 'Pressekit',
    kicker: 'Pressekit · Konzert',
    lead: 'Alles für die Ankündigung dieses Auftritts: Eckdaten, Plakat und Story als Bild, fertige Texte zum Kopieren und unsere Songliste.',
    past: 'Dieses Konzert ist schon vorbei.',
    date: 'Datum', until: 'bis', start: 'Beginn', time: (t: string) => t + ' Uhr', tba: 'wird noch bekannt gegeben',
    place: 'Ort', entry: 'Eintritt', free: 'frei', soon: 'Infos folgen', arrival: 'Anfahrt & Parken',
    page: 'Konzertseite', route: 'Anfahrt', rider: 'Technik & Rider',
    bilder: 'Plakat & Story',
    bilderInfo: 'Mit QR-Code zur Konzertseite (Uhrzeit, Anfahrt, Erinnerung im Kalender). Gern aushängen, posten und teilen.',
    plakat: 'Plakat (quadratisch, für Beitrag und Aushang)', story: 'Story / Status (Hochformat)',
    laden: 'Bild wird erstellt …', download: 'Herunterladen',
    texte: 'Texte zum Kopieren',
    texteInfo: 'Fertige Texte mit Link zur Konzertseite – für Beitrag, Story oder Status.',
    beitrag: 'Beitrag zum Plakat', story1: 'Zwei Wochen vorher', woche: 'Eine Woche vorher', morgen: 'Am Tag davor', heute: 'Am Auftrittstag',
    copy: 'Kopieren', copied: 'Kopiert!',
    songs: 'Songliste',
    songsInfo: (n: number) => `Unser Repertoire (${n} Songs) – die Setlist für den Abend stellen wir passend zum Publikum zusammen.`,
    songsCopy: 'Liste kopieren', songsTxt: 'Als Textdatei',
    notFound: 'Konzert nicht gefunden', notFoundText: 'Diesen Termin gibt es nicht (mehr). Alles Weitere findet ihr im',
  },
  {
    back: 'Press kit',
    kicker: 'Press kit · Show',
    lead: 'Everything for announcing this show: key facts, poster and story as images, ready-made texts to copy and our song list.',
    past: 'This show is already over.',
    date: 'Date', until: 'until', start: 'Start', time: (t: string) => t, tba: 'to be announced',
    place: 'Venue', entry: 'Entry', free: 'free', soon: 'details to follow', arrival: 'Getting there & parking',
    page: 'Show page', route: 'Directions', rider: 'Tech & rider',
    bilder: 'Poster & story',
    bilderInfo: 'With a QR code to the show page (time, directions, calendar reminder). Feel free to put up, post and share.',
    plakat: 'Poster (square, for posts and notice boards)', story: 'Story / status (portrait)',
    laden: 'Creating image …', download: 'Download',
    texte: 'Texts to copy',
    texteInfo: 'Ready-made texts (in German) with a link to the show page – for posts, stories or status.',
    beitrag: 'Post for the poster', story1: 'Two weeks before', woche: 'One week before', morgen: 'The day before', heute: 'On the day',
    copy: 'Copy', copied: 'Copied!',
    songs: 'Song list',
    songsInfo: (n: number) => `Our repertoire (${n} songs) – we put together the setlist for the night to suit the audience.`,
    songsCopy: 'Copy list', songsTxt: 'As text file',
    notFound: 'Show not found', notFoundText: "This date doesn't exist (any more). Everything else is in the",
  },
  {
    back: 'Perskit',
    kicker: 'Perskit · Optreden',
    lead: 'Alles voor de aankondiging van dit optreden: gegevens, affiche en story als afbeelding, kant-en-klare teksten en onze nummerlijst.',
    past: 'Dit optreden is al voorbij.',
    date: 'Datum', until: 'tot', start: 'Aanvang', time: (t: string) => t + ' uur', tba: 'wordt nog bekendgemaakt',
    place: 'Locatie', entry: 'Entree', free: 'gratis', soon: 'info volgt', arrival: 'Bereikbaarheid & parkeren',
    page: 'Optredenpagina', route: 'Route', rider: 'Techniek & rider',
    bilder: 'Affiche & story',
    bilderInfo: 'Met QR-code naar de optredenpagina (tijd, route, herinnering in de agenda). Graag ophangen, posten en delen.',
    plakat: 'Affiche (vierkant, voor posts en ophangen)', story: 'Story / status (staand)',
    laden: 'Afbeelding wordt gemaakt …', download: 'Downloaden',
    texte: 'Teksten om te kopiëren',
    texteInfo: 'Kant-en-klare teksten (in het Duits) met link naar de optredenpagina – voor post, story of status.',
    beitrag: 'Post bij de affiche', story1: 'Twee weken ervoor', woche: 'Een week ervoor', morgen: 'De dag ervoor', heute: 'Op de dag zelf',
    copy: 'Kopiëren', copied: 'Gekopieerd!',
    songs: 'Nummerlijst',
    songsInfo: (n: number) => `Ons repertoire (${n} nummers) – de setlist voor de avond stellen we samen passend bij het publiek.`,
    songsCopy: 'Lijst kopiëren', songsTxt: 'Als tekstbestand',
    notFound: 'Optreden niet gevonden', notFoundText: 'Deze datum bestaat niet (meer). Al het andere vinden jullie in de',
  },
);

@Component({
  selector: 'app-presse-konzert',
  // „vorbei“ und die Bilder hängen vom Browser ab – komplett im Browser aufbauen
  host: { ngSkipHydration: 'true' },
  imports: [RouterLink, MatIconModule, LDatePipe, LocPipe],
  template: `
    <section class="section presse-konzert">
      <a class="back" [routerLink]="'/presse' | loc"><mat-icon>arrow_back</mat-icon> {{ t().back }}</a>
      @if (show(); as s) {
        <p class="kicker">{{ t().kicker }}</p>
        <h2>{{ s.venue }}</h2>
        <p class="lead">{{ t().lead }}</p>
        @if (past()) { <p class="past"><mat-icon>history</mat-icon> {{ t().past }}</p> }

        <dl class="facts">
          <div><dt><mat-icon>event</mat-icon> {{ t().date }}</dt><dd>{{ s.date | ldate: 'full' }}@if (s.endDate) { <br />{{ t().until }} {{ s.endDate | ldate: 'full' }} }</dd></div>
          <div><dt><mat-icon>schedule</mat-icon> {{ t().start }}</dt><dd>{{ s.time ? t().time(s.time) : t().tba }}</dd></div>
          <div><dt><mat-icon>place</mat-icon> {{ t().place }}</dt><dd>{{ s.venue }}@if (s.city) { <br />{{ s.city }} }</dd></div>
          <div><dt><mat-icon>local_activity</mat-icon> {{ t().entry }}</dt><dd>{{ s.price === 0 ? t().free : s.price ? s.price + ' €' : t().soon }}</dd></div>
        </dl>
        @if (s.anfahrt) { <p class="anfahrt"><mat-icon>local_parking</mat-icon><span><strong>{{ t().arrival }}:</strong> {{ content.t(s.anfahrt) }}</span></p> }
        <div class="links">
          <a class="btn" [routerLink]="('/konzerte/' + id()) | loc"><mat-icon>open_in_new</mat-icon> {{ t().page }}</a>
          @if (s.mapsUrl) { <a class="btn" [href]="s.mapsUrl" target="_blank" rel="noopener"><mat-icon>map</mat-icon> {{ t().route }}</a> }
          <a class="btn" [routerLink]="'/technik' | loc"><mat-icon>tune</mat-icon> {{ t().rider }}</a>
        </div>

        <h3>{{ t().bilder }}</h3>
        <p class="info">{{ t().bilderInfo }}</p>
        <div class="bilder">
          @for (b of bilder(); track b.format) {
            <figure [class.story]="b.format === 'story'">
              @if (b.url) { <img [src]="b.url" [alt]="b.format === 'story' ? t().story : t().plakat" /> } @else { <span class="laden">{{ t().laden }}</span> }
              <figcaption>{{ b.format === 'story' ? t().story : t().plakat }}
                @if (b.url) { <a class="btn small" [href]="b.url" [download]="b.name"><mat-icon>download</mat-icon> {{ t().download }}</a> }
              </figcaption>
            </figure>
          }
        </div>

        <h3>{{ t().texte }}</h3>
        <p class="info">{{ t().texteInfo }}</p>
        <div class="texte">
          @for (x of texte(); track x.id) {
            <div class="text">
              <p class="titel">{{ x.titel }}</p>
              <pre>{{ x.text }}</pre>
              <button type="button" class="btn small" (click)="kopieren(x.id, x.text)"><mat-icon>{{ kopiert() === x.id ? 'check' : 'content_copy' }}</mat-icon> {{ kopiert() === x.id ? t().copied : t().copy }}</button>
            </div>
          }
        </div>

        <h3>{{ t().songs }}</h3>
        <p class="info">{{ t().songsInfo(songs.length) }}</p>
        <div class="text-actions">
          <button type="button" class="btn small" (click)="kopieren('songs', songText)"><mat-icon>{{ kopiert() === 'songs' ? 'check' : 'content_copy' }}</mat-icon> {{ kopiert() === 'songs' ? t().copied : t().songsCopy }}</button>
          <button type="button" class="btn small" (click)="songsSpeichern()"><mat-icon>description</mat-icon> {{ t().songsTxt }}</button>
        </div>
        <ol class="songs">
          @for (s of songs; track s.title + s.artist) { <li><span>{{ s.title }}</span> <span class="a">{{ s.artist }}</span></li> }
        </ol>
      } @else {
        <h2>{{ t().notFound }}</h2>
        <p class="lead">{{ t().notFoundText }} <a [routerLink]="'/presse' | loc">{{ t().back }}</a>.</p>
      }
    </section>
  `,
  styles: `
    .presse-konzert { max-width: 1000px; }
    .back { display: inline-flex; align-items: center; gap: 6px; color: var(--bn-fog); text-decoration: none; font-size: .9rem; }
    .back:hover { color: var(--bn-sunset); }
    h3 { font-family: var(--bn-display); font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .08em; margin: 40px 0 10px; }
    .info, .past { color: var(--bn-fog); font-size: .92rem; line-height: 1.6; margin: 0 0 14px; }
    .past { display: flex; align-items: center; gap: 8px; }
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin: 20px 0 0; border: 1px solid var(--bn-line); border-radius: 12px; overflow: hidden; }
    .facts > div { padding: 14px 16px; box-shadow: 1px 0 0 var(--bn-line), 0 1px 0 var(--bn-line); }
    dt { display: flex; align-items: center; gap: 6px; font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; color: var(--bn-fog); }
    dt mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--bn-sunset); }
    dd { margin: 6px 0 0; line-height: 1.5; }
    .anfahrt { display: flex; gap: 8px; margin: 14px 0 0; line-height: 1.55; }
    .anfahrt mat-icon { flex: none; color: var(--bn-sunset); }
    .links, .text-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
  `,
})
export class PresseKonzertPage {
  /** Konzert-ID aus der URL (/presse/:id) – das Datum wie bei der Konzertseite */
  readonly id = input.required<string>();
  private readonly band = inject(BandService);
  private readonly i18n = inject(I18n);
  protected readonly content = inject(Content);
  protected readonly t = this.i18n.t(TEXT);
  protected readonly show = computed(() => this.band.publicShows.find((s) => this.band.showId(s) === this.id()));
  protected readonly past = computed(() => {
    const s = this.show();
    return !!s && (s.endDate ?? s.date) < new Date().toISOString().slice(0, 10);
  });

  // Plakat und Story – im Browser gezeichnet wie im Backstage, QR-Code mit Herkunft (Kampagne zählt mit)
  protected readonly bilder = signal<{ format: 'feed' | 'story'; url?: string; name: string }[]>([]);
  private urls: string[] = [];

  protected readonly texte = computed(() => {
    const s = this.show();
    if (!s) return [];
    const t = this.t();
    const story = kampagnenLink(this.id(), 'story');
    return [
      { id: 'beitrag', titel: t.beitrag, text: postText(s, kampagnenLink(this.id(), 'text')) },
      { id: 'story-1', titel: t.story1, text: schrittText('story-1', s, story) },
      { id: 'woche', titel: t.woche, text: schrittText('woche', s, story) },
      { id: 'morgen', titel: t.morgen, text: schrittText('morgen', s, story) },
      { id: 'heute', titel: t.heute, text: schrittText('heute', s, story) },
    ];
  });

  protected readonly songs = repertoire.tracks.map((x) => ({ title: x.title, artist: x.artist }));
  protected readonly songText = this.songs.map((x, i) => `${i + 1}. ${x.title} – ${x.artist}`).join('\n');
  protected readonly kopiert = signal('');

  constructor() {
    const pageMeta = inject(PageMetaService);
    effect(() => {
      const s = this.show();
      pageMeta.set({
        title: s ? `Pressekit: ${s.venue} – ${s.date.split('-').reverse().join('.')} – Blickfeld Nord` : 'Pressekit – Blickfeld Nord',
        path: this.i18n.link(`/presse/${this.id()}`).slice(1),
        robots: 'noindex',
      });
    });
    afterNextRender(() => void this.zeichnen());
    inject(DestroyRef).onDestroy(() => this.urls.forEach((u) => URL.revokeObjectURL(u)));
  }

  private async zeichnen(): Promise<void> {
    const s = this.show();
    if (!s) return;
    const formate = ['feed', 'story'] as const;
    this.bilder.set(formate.map((format) => ({ format, name: posterFileName(s, format) })));
    for (const format of formate) {
      try {
        const blob = await renderPoster(s, format, kampagnenLink(this.id(), format === 'story' ? 'story' : 'plakat'));
        const url = URL.createObjectURL(blob);
        this.urls.push(url);
        this.bilder.update((b) => b.map((x) => (x.format === format ? { ...x, url } : x)));
      } catch {
        // ohne Canvas kein Bild
      }
    }
  }

  protected async kopieren(id: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.kopiert.set(id);
      setTimeout(() => this.kopiert() === id && this.kopiert.set(''), 2000);
    } catch {
      window.prompt(this.t().copy, text);
    }
  }

  protected songsSpeichern(): void {
    const url = URL.createObjectURL(new Blob([`Blickfeld Nord – Songliste\n\n${this.songText}\n`], { type: 'text/plain;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: 'blickfeld-nord-songliste.txt' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
