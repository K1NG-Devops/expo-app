#!/usr/bin/env node
/*
 Lightweight docs policy check: fails if files under docs/ other than README.md or OBSOLETE/* are staged.
 Use in local dev or non-GitHub CI: `npm run docs:policy:check`.
*/

const { execSync } = require('node:child_process');

try {
  const diff = execSync('git diff --cached --name-only', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .split('\n')
    .filter(Boolean);

  const offenders = diff.filter((p) => p.startsWith('docs/') && p !== 'docs/README.md' && !p.startsWith('docs/OBSOLETE/'));

  if (offenders.length > 0) {
    console.error('Docs policy violation: only docs/README.md may be modified under docs/ (aside from archived docs in docs/OBSOLETE/).');
    console.error('Offending files:\n' + offenders.join('\n'));
    process.exit(1);
  }

  console.log('Docs policy check passed.');
} catch (err) {
  console.error('Docs policy check encountered an error:', err.message);
  process.exit(1);
}