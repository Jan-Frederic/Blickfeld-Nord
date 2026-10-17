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
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'data', 'repertoire.json');

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
if (!id || !secret || !refresh) {
  console.error(
    'SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET oder SPOTIFY_REFRESH_TOKEN fehlen (GitHub: Settings → Secrets and variables → Actions).\n' +
      'Das Refresh-Token einmalig mit „node scripts/spotify-login.mjs“ erzeugen.',
  );
  process.exit(1);
}

async function json(res, what) {
  if (!res.ok) {
    console.error(`${what} fehlgeschlagen: HTTP ${res.status} ${await res.text()}`);
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

const tracks = [];
// Seit der API-Umstellung im Februar/März 2026 heißt der Endpunkt …/items (früher …/tracks)
// und jeder Eintrag steckt unter „item“ statt „track“ – beides wird unterstützt.
let url = `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/items?limit=50&market=DE`;
while (url) {
  const page = await json(await fetch(url, { headers: { Authorization: `Bearer ${token}` } }), 'Playlist laden');
  for (const entry of page.items) {
    const track = entry.item ?? entry.track;
    if (!track || track.type !== 'track') continue; // Podcasts/gelöschte Titel überspringen
    tracks.push({
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      year: Number(track.album?.release_date?.slice(0, 4)) || undefined,
      url: track.external_urls?.spotify,
    });
  }
  url = page.next;
}

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
