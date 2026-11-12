// Bühnen-, Probe- und Übe-Modus: Soll der Modus das Vollbild des Browsers anfordern?
// In der installierten App auf Handy und Tablet nicht – die läuft schon insgesamt im Vollbild (site.webmanifest:
// "display": "fullscreen"). Im Browser-Vollbild zeigt Android dagegen bei jedem Wisch vom oberen Rand „Zum Beenden des
// Vollbildmodus …“ und wirft den Modus mit „Zurück“ aus dem Vollbild; das lässt sich von einer Seite aus nicht
// abschalten. Im Browser-Tab (Adressleiste weg) und am Computer bleibt es beim Browser-Vollbild.
export function browserVollbild(passt: (abfrage: string) => boolean = (a) => typeof matchMedia === 'function' && matchMedia(a).matches, iosApp = typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone === true): boolean {
  const installiert = iosApp || passt('(display-mode: standalone)') || passt('(display-mode: fullscreen)') || passt('(display-mode: minimal-ui)');
  return !(installiert && passt('(pointer: coarse)'));
}
