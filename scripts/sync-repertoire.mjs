#!/usr/bin/env node
// Holt die Repertoire-Playlist über die offizielle Spotify-Web-API und schreibt src/app/data/repertoire.json.
// Läuft im GitHub-Workflow „Repertoire aktualisieren“ (.github/workflows/repertoire.yml).
// Benötigt die Umgebungsvariablen SPOTIFY_CLIENT_ID und SPOTIFY_CLIENT_SECRET (Spotify-App, „Client Credentials“).
// Lokal: SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… node scripts/sync-repertoire.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAYLIST_ID = '6O7apXN53rSGaWGhP8S8TW';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'data', 'repertoire.json');

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error('SPOTIFY_CLIENT_ID und SPOTIFY_CLIENT_SECRET fehlen (GitHub: Settings → Secrets and variables → Actions).');
  process.exit(1);
}

async function json(res, what) {
  if (!res.ok) {
    console.error(`${what} fehlgeschlagen: HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  return res.json();
}

const token = (
  await json(
    await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    }),
    'Anmeldung bei Spotify',
  )
).access_token;

const tracks = [];
let url =
  `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?limit=100&market=DE` +
  '&fields=next,items(track(name,artists(name),album(release_date),external_urls(spotify),type))';
while (url) {
  const page = await json(await fetch(url, { headers: { Authorization: `Bearer ${token}` } }), 'Playlist laden');
  for (const { track } of page.items) {
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
