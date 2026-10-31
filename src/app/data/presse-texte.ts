import { Show } from './band.service';
import { postText } from './poster';
import { schrittText } from './werbeplan';

// Fertige Texte für Beitrag und Stories (Pressekit je Konzert) – Deutsch wie im Backstage-Werbeplan, dazu Englisch
// und Niederländisch für Gäste und Veranstalter von jenseits der Grenze. Links mit Herkunft und Kampagne.
export type TextLang = 'de' | 'en' | 'nl';
export const TEXT_SCHRITTE = ['beitrag', 'story-1', 'woche', 'morgen', 'heute'] as const;

const TAGE = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  nl: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
};

function wann(d: string, lang: 'en' | 'nl'): string {
  const [j, m, t] = d.split('-');
  const tag = TAGE[lang][new Date(`${d}T12:00:00`).getDay()];
  return lang === 'en' ? `${tag}, ${t}/${m}/${j}` : `${tag} ${t}-${m}-${j}`;
}

export function presseText(schritt: (typeof TEXT_SCHRITTE)[number], s: Show, lang: TextLang, links: { text: string; story: string }): string {
  if (lang === 'de') return schritt === 'beitrag' ? postText(s, links.text) : schrittText(schritt, s, links.story);
  const en = lang === 'en';
  const link = schritt === 'beitrag' ? links.text : links.story;
  const ort = `📍 ${s.venue}${s.city ? `, ${s.city}` : ''}`;
  const zeit = s.time ? (en ? ` · from ${s.time}` : ` · vanaf ${s.time} uur`) : '';
  const datum = `📅 ${wann(s.date, lang)}${s.endDate ? (en ? ` to ${wann(s.endDate, lang)}` : ` t/m ${wann(s.endDate, lang)}`) : ''}${zeit}`;
  const eintritt = s.price === 0 ? [en ? '🎟️ Free entry' : '🎟️ Gratis entree'] : s.price ? [`🎟️ ${en ? 'Entry' : 'Entree'} € ${s.price}`] : [];
  const kopf: Record<string, string[]> = {
    beitrag: [en ? '🎶 Blickfeld Nord live! 🎶' : '🎶 Blickfeld Nord live! 🎶', '', datum, ort, ...eintritt, '', en ? 'Come along, sing along and party with us – we look forward to seeing you! 🍻' : 'Kom langs, zing mee en feest met ons – we kijken ernaar uit! 🍻'],
    'story-1': [en ? '🎶 In two weeks we are live! 🎶' : '🎶 Over twee weken spelen we live! 🎶', '', datum, ort, ...eintritt],
    woche: [en ? '🎸 Next week is the night!' : '🎸 Volgende week is het zover!', '', datum, ort, ...eintritt, '', en ? 'Spread the word and bring your friends!' : 'Vertel het door en neem je vrienden mee!'],
    morgen: [en ? '🎶 Tomorrow we play!' : '🎶 Morgen spelen we!', '', `${ort}${zeit}`, ...eintritt, '', en ? 'Come by and sing along – we look forward to seeing you! 🍻' : 'Kom langs en zing mee – we kijken ernaar uit! 🍻'],
    heute: [en ? '🎉 Live tonight!' : '🎉 Vanavond live!', '', `${ort}${zeit}`, ...eintritt, '', en ? 'See you soon! 🍻' : 'Tot zo! 🍻'],
  };
  return [...kopf[schritt], '', `👉 ${link}`, '', '#blickfeldnord #livemusic #liveband'].join('\n');
}
