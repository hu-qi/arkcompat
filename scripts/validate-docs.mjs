#!/usr/bin/env node
/**
 * Dependency-free Markdown integrity check for the M0 planning baseline.
 * This is NOT a replacement for TypeScript tests or the acceptance benchmark.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'README.md',
  'TODO.md',
  'ROADMAP.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'docs/PRD.md',
  'docs/ARCHITECTURE.md',
  'docs/QUALITY-GATES.md',
  'docs/CI-STRATEGY.md',
  'docs/DECISIONS.md',
  'docs/ENGINEERING-PLAN.md',
  'docs/PROJECT-EXECUTION-LEDGER.md',
  'docs/PROJECT-COMPLETION-PLAN.md',
  'docs/PROJECT-COMPLETION-ACTIONS.md',
  'docs/PROJECT-MASTER-TODO.md',
  'docs/ACCEPTANCE-SIGNOFF-PACKAGE.md',
  'docs/LEGACY-AUDIT.md',
  'docs/REPOSITORY-STRUCTURE.md',
];
const errors = [];
for (const file of required) {
  if (!existsSync(join(root, file))) errors.push(`Missing required document: ${file}`);
}
function markdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return markdownFiles(full);
    return full.endsWith('.md') ? [full] : [];
  });
}
const files = [
  ...required.filter((p) => !p.startsWith('docs/')).map((p) => join(root, p)),
  ...markdownFiles(join(root, 'docs')),
  ...markdownFiles(join(root, '.github')),
].filter((p) => existsSync(p));
for (const file of new Set(files)) {
  const text = readFileSync(file, 'utf8');
  const links = text.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g);
  for (const [, raw] of links) {
    const url = raw.trim().replace(/^<|>$/g, '').split(/[?#]/)[0];
    if (!url || /^(?:https?:|mailto:|data:|\/\/)/i.test(url)) continue;
    let decoded;
    try { decoded = decodeURIComponent(url); }
    catch { errors.push(`Invalid link encoding in ${file}: ${raw}`); continue; }
    if (!existsSync(resolve(dirname(file), decoded))) {
      errors.push(`Broken local link in ${file}: ${raw}`);
    }
  }
}
if (!readFileSync(join(root, 'ROADMAP.md'), 'utf8').includes('2026-12-23')) {
  errors.push('Roadmap must state the 2026-12-23 acceptance deadline');
}
if (errors.length) {
  for (const message of errors) console.error('ERROR:', message);
  process.exitCode = 1;
} else {
  console.log(`Documentation integrity OK (${files.length} Markdown files checked)`);
}
