// Conventional Commits – Grundlage für die automatischen Versionen (semantic-release, .releaserc.json).
// Zusätzlich zu den Standard-Typen gibt es „content“ für neue Inhalte (Auftritte, Historie, Fotos) → Patch-Version.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'perf', 'content', 'docs', 'style', 'refactor', 'test', 'build', 'ci', 'chore', 'revert']],
    // deutsche Beschreibungen beginnen oft groß („Neue Galerie“) – Groß-/Kleinschreibung daher frei
    'subject-case': [0],
    'body-max-line-length': [0],
  },
};
