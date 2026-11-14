// Deploy-Status für „Benachrichtigungen“: Ist der letzte Lauf von „Deploy to GitHub Pages“ auf main gescheitert, zeigt die
// Website noch den alten Stand. Öffentliche GitHub-API ohne Anmeldung (60 Abrufe je Stunde und Gerät – reicht).
export const DEPLOY_API = 'https://api.github.com/repos/Jan-Frederic/Blickfeld-Nord/actions/workflows/deploy-pages.yml/runs?branch=main&per_page=5';

export interface DeployLauf {
  conclusion: string | null;
  status: string;
  html_url: string;
  created_at: string;
  display_title?: string;
}

/** gescheiterter letzter abgeschlossener Lauf (abgebrochene zählen nicht – sie werden von neueren ersetzt) – sonst null */
export function deployFehler(laeufe: DeployLauf[]): DeployLauf | null {
  const letzter = laeufe.find((l) => l.status === 'completed' && l.conclusion !== 'cancelled' && l.conclusion !== 'skipped');
  return letzter?.conclusion === 'failure' ? letzter : null;
}

export async function deployStatus(): Promise<DeployLauf | null> {
  try {
    const res = await fetch(DEPLOY_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return null;
    return deployFehler(((await res.json()) as { workflow_runs?: DeployLauf[] }).workflow_runs ?? []);
  } catch {
    return null;
  }
}
