import { fehler403 } from './spotify-remote';

describe('Spotify-Fernsteuerung: 403 einordnen', () => {
  it('Premium fehlt, Konto nicht freigeschaltet oder Befehl passt gerade nicht', () => {
    expect(fehler403('{"error":{"status":403,"message":"Player command failed: Premium required","reason":"PREMIUM_REQUIRED"}}')).toBe('premium');
    expect(fehler403('User not registered in the Developer Dashboard')).toBe('freigabe');
    expect(fehler403('{"error":{"status":403,"message":"Player command failed: Restriction violated","reason":"UNKNOWN"}}')).toBe('nichts');
  });
});
