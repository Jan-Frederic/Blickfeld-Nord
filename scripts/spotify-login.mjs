#!/usr/bin/env node
// Einmalige Spotify-Anmeldung für den Repertoire-Abgleich: erzeugt das Refresh-Token für das
// GitHub-Secret SPOTIFY_REFRESH_TOKEN. Lokal auf dem eigenen Rechner ausführen (Node 20+):
//
//   SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… node scripts/spotify-login.mjs
//
// Vorher in der Spotify-App (developer.spotify.com → Dashboard → App → Settings) als Redirect URI
// eintragen:  http://127.0.0.1:8888/callback
// Anmelden mit dem Spotify-Konto, dem die Repertoire-Playlist gehört (oder das sie mitbearbeitet).
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

const REDIRECT = 'http://127.0.0.1:8888/callback';
const SCOPES = 'playlist-read-private playlist-read-collaborative';

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error('Bitte SPOTIFY_CLIENT_ID und SPOTIFY_CLIENT_SECRET setzen (dieselben Werte wie in den GitHub-Secrets).');
  process.exit(1);
}

const state = randomBytes(16).toString('hex');
const login =
  'https://accounts.spotify.com/authorize?' +
  new URLSearchParams({ response_type: 'code', client_id: id, scope: SCOPES, redirect_uri: REDIRECT, state });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get('code');
  if (url.searchParams.get('state') !== state || !code) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Anmeldung abgebrochen oder ungültig.');
    console.error('Anmeldung fehlgeschlagen:', url.searchParams.get('error') ?? 'ungültige Antwort');
    server.close();
    process.exitCode = 1;
    return;
  }
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT }),
  });
  const data = await tokenRes.json();
  if (!tokenRes.ok || !data.refresh_token) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Token-Abruf fehlgeschlagen – Details im Terminal.');
    console.error('Token-Abruf fehlgeschlagen:', data);
    process.exitCode = 1;
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Fertig – das Fenster kann geschlossen werden. Das Token steht im Terminal.');
    console.log('\nRefresh-Token (als GitHub-Secret SPOTIFY_REFRESH_TOKEN speichern, nirgends sonst ablegen):\n');
    console.log(data.refresh_token + '\n');
  }
  server.close();
});

server.listen(8888, '127.0.0.1', () => {
  console.log('Diesen Link im Browser öffnen und mit dem Spotify-Konto der Playlist anmelden:\n');
  console.log(login + '\n');
});
