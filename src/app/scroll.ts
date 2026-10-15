// Scrollt zu einem Abschnitt der Startseite. Abschnitte werden teils verzögert geladen –
// daher kurz warten, bis das Element im DOM ist (max. ~2 s).
export function scrollToSection(id: string, attempts = 40): void {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  } else if (attempts > 0) {
    setTimeout(() => scrollToSection(id, attempts - 1), 50);
  }
}
