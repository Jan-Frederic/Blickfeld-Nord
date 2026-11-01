import { deployFehler } from './deploy-status';

const L = (conclusion: string | null, status = 'completed') => ({ conclusion, status, html_url: 'u', created_at: '2026-11-01T10:00:00Z' });

describe('deployFehler', () => {
  it('meldet nur einen gescheiterten letzten Lauf, abgebrochene und laufende zählen nicht', () => {
    expect(deployFehler([L('failure')])?.conclusion).toBe('failure');
    expect(deployFehler([L(null, 'in_progress'), L('cancelled'), L('failure'), L('success')])?.conclusion).toBe('failure');
    expect(deployFehler([L('cancelled'), L('success'), L('failure')])).toBeNull();
    expect(deployFehler([])).toBeNull();
  });
});
