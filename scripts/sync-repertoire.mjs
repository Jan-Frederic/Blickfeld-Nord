#!/usr/bin/env node
// Holt die Repertoire-Playlist über die offizielle Spotify-Web-API und schreibt src/app/data/repertoire.json.
// Läuft im GitHub-Workflow „Repertoire aktualisieren“ (.github/workflows/repertoire.yml).
// Benötigt SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET und SPOTIFY_REFRESH_TOKEN. Seit der API-Umstellung 2026
// liefert Spotify Playlist-Inhalte nur noch mit Benutzer-Login – das Refresh-Token einmalig mit
// `node scripts/spotify-login.mjs` erzeugen (siehe README).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAYLIST_ID = '6O7apXN53rSGaWGhP8S8TW';
const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'data');
const OUT = join(DATA, 'repertoire.json');
// Weitere Listen nur fürs Backstage (Songs → Liste gleicht alle gegeneinander ab) – Reihenfolge der Songs bleibt
const BACKSTAGE_LISTEN = [
  { key: 'setlist', id: '6rE8puTezdETpgZxMCrzP2' },
  { key: 'probe', id: '7eJtC9Qfm7NvjAVJWh3Gfx' },
  { key: 'repertoire', id: '5gQJdIVofQQBFc3tRXDOwA' },
  { key: 'wunschliste', id: '65HmuHebsSOpzWQKNHAkL3' },
  { key: 'archiv', id: '1KYYKkZiF8h9GdXPgSIISc' },
];
const LISTEN_OUT = join(DATA, 'playlisten.json');

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
if (!id || !secret || !refresh) {
  console.error(
    'SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET oder SPOTIFY_REFRESH_TOKEN fehlen (GitHub: Settings → Secrets and variables → Actions).\n' +
      'Das Refresh-Token einmalig mit „node scripts/spotify-login.mjs“ erzeugen.',
  );
  process.exit(1);
}

async function json(res, what, weiter = false) {
  if (!res.ok) {
    console.error(`${what} fehlgeschlagen: HTTP ${res.status} ${await res.text()}`);
    if (weiter) return undefined;
    process.exit(1);
  }
  return res.json();
}

const auth = await json(
  await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
  }),
  'Anmeldung bei Spotify',
);
const token = auth.access_token;
if (auth.refresh_token && auth.refresh_token !== refresh) {
  console.warn('Hinweis: Spotify hat ein neues Refresh-Token ausgegeben – das alte bleibt in der Regel gültig.');
}

/** alle Titel einer Playlist in ihrer Reihenfolge; undefined, wenn Spotify sie nicht herausgibt */
async function playlist(id, weiter = false) {
  const tracks = [];
  // Seit der API-Umstellung im Februar/März 2026 heißt der Endpunkt …/items (früher …/tracks)
  // und jeder Eintrag steckt unter „item“ statt „track“ – beides wird unterstützt.
  let url = `https://api.spotify.com/v1/playlists/${id}/items?limit=50&market=DE`;
  while (url) {
    const page = await json(await fetch(url, { headers: { Authorization: `Bearer ${token}` } }), `Playlist ${id} laden`, weiter);
    if (!page) return undefined;
    for (const entry of page.items) {
      const track = entry.item ?? entry.track;
      if (!track || track.type !== 'track') continue; // Podcasts/gelöschte Titel überspringen
      tracks.push({
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        year: Number(track.album?.release_date?.slice(0, 4)) || undefined,
        // Länge in Sekunden – für die Spieldauer der Sets in der Backstage-Setlist
        duration: track.duration_ms ? Math.round(track.duration_ms / 1000) : undefined,
        url: track.external_urls?.spotify,
      });
    }
    url = page.next;
  }
  return tracks;
}

const tracks = await playlist(PLAYLIST_ID);

// Doppelte entfernen, alphabetisch nach Titel
const seen = new Set();
const unique = tracks
  .filter((t) => {
    const key = `${t.title}|${t.artist}`.toLowerCase();
    return seen.has(key) ? false : (seen.add(key), true);
  })
  .sort((a, b) => a.title.localeCompare(b.title, 'de'));

let previous = '';
try {
  previous = JSON.stringify(JSON.parse(readFileSync(OUT, 'utf8')).tracks);
} catch {}
if (previous === JSON.stringify(unique)) {
  console.log(`Repertoire unverändert (${unique.length} Songs).`);
} else {
  writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), tracks: unique }, null, 2) + '\n');
  console.log(`Repertoire aktualisiert: ${unique.length} Songs.`);
}

// Backstage-Listen: eine Liste, die Spotify (noch) nicht herausgibt, behält ihren letzten Stand
let vorher = { listen: [] };
try {
  vorher = JSON.parse(readFileSync(LISTEN_OUT, 'utf8'));
} catch {}
const listen = [];
for (const l of BACKSTAGE_LISTEN) {
  const info = await json(await fetch(`https://api.spotify.com/v1/playlists/${l.id}?fields=name`, { headers: { Authorization: `Bearer ${token}` } }), `Liste ${l.key}`, true);
  const titel = await playlist(l.id, true);
  const alt = vorher.listen.find((x) => x.key === l.key);
  if (!titel) console.warn(`Liste ${l.key} nicht lesbar – bleibt beim letzten Stand.`);
  else console.log(`Liste ${l.key}: „${info?.name ?? '?'}“, ${titel.length} Songs.`);
  listen.push({ key: l.key, id: l.id, name: info?.name ?? alt?.name ?? '', tracks: titel ?? alt?.tracks ?? [] });
}
if (JSON.stringify(vorher.listen) !== JSON.stringify(listen)) {
  writeFileSync(LISTEN_OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), listen }, null, 2) + '\n');
  console.log('Backstage-Listen aktualisiert.');
} else console.log('Backstage-Listen unverändert.');
