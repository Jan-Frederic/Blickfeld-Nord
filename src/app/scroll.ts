// Scrollt zu einem Abschnitt der Startseite. Abschnitte werden teils verzögert geladen –
// daher kurz warten, bis das Element im DOM ist (max. ~2 s).
export function scrollToSection(id: string, attempts = 40): void {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    keepInView(el);
  } else if (attempts > 0) {
    setTimeout(() => scrollToSection(id, attempts - 1), 50);
  }
}

// Laden darüberliegende Abschnitte oder Bilder erst nach dem Sprung, rutscht das Ziel wieder nach unten
// (z. B. von /booking aus zur Galerie). Daher ein paar Sekunden lang prüfen, ob sich seine Position auf
// der Seite verschoben hat, und nachkorrigieren – bis der Besucher selbst scrollt.
function keepInView(el: HTMLElement, ms = 4000): void {
  const userEvents = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
  const pageTop = () => el.getBoundingClientRect().top + scrollY;
  let last = pageTop();
  const check = setInterval(() => {
    const now = pageTop();
    if (Math.abs(now - last) > 2) el.scrollIntoView({ behavior: 'smooth' });
    last = now;
  }, 150);
  const stop = () => {
    clearInterval(check);
    clearTimeout(timer);
    userEvents.forEach((e) => removeEventListener(e, stop));
  };
  const timer = setTimeout(stop, ms);
  userEvents.forEach((e) => addEventListener(e, stop, { passive: true }));
}
