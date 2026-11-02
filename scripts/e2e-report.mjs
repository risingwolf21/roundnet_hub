#!/usr/bin/env node
// Recalculates the "Teststatus" section of README.md from
//   - e2e/coverage-manifest.json        (every user-facing function = "flow")
//   - test-results/results.json         (Playwright JSON reporter)
//   - coverage/e2e/coverage-summary.json (nyc report of the Istanbul e2e coverage, optional)
// Run after `playwright test` (CI: playwright.yml). Usage: node scripts/e2e-report.mjs [--stdout]
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'e2e/coverage-manifest.json');
const RESULTS = path.join(ROOT, 'test-results/results.json');
const COVERAGE = path.join(ROOT, 'coverage/e2e/coverage-summary.json');
const README = path.join(ROOT, 'README.md');
const START = '<!-- E2E-STATUS:START -->';
const END = '<!-- E2E-STATUS:END -->';

if (!existsSync(RESULTS)) {
  console.log(`e2e-report: ${path.relative(ROOT, RESULTS)} not found — nothing to do.`);
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const results = JSON.parse(readFileSync(RESULTS, 'utf8'));

// ---- collect tests ---------------------------------------------------------------------------
/** @type {{title:string,file:string,project:string,status:string,flows:string[],fixme?:string}[]} */
const tests = [];
const walk = (suite, file) => {
  const f = suite.file ?? file;
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const last = t.results?.[t.results.length - 1];
      const annotations = [...(t.annotations ?? []), ...(last?.annotations ?? [])];
      const flows = [...new Set(annotations.filter((a) => a.type === 'flow').map((a) => a.description))];
      const fixme = annotations.find((a) => a.type === 'fixme' || a.type === 'bug');
      // t.status: expected | unexpected | flaky | skipped
      const status = fixme && t.status === 'skipped' ? 'fixme' : t.status;
      tests.push({ title: spec.title, file: f, project: t.projectName, status, flows, fixme: fixme?.description });
    }
  }
  for (const child of suite.suites ?? []) walk(child, f);
};
for (const s of results.suites ?? []) walk(s, s.file);

// ---- per-flow status -------------------------------------------------------------------------
const knownIds = new Set(manifest.areas.flatMap((a) => a.flows.map((f) => f.id)));
const unknown = [...new Set(tests.flatMap((t) => t.flows))].filter((id) => !knownIds.has(id));
if (unknown.length) console.warn(`e2e-report: tests reference unknown flow ids: ${unknown.join(', ')}`);

const flowStatus = (flow) => {
  const linked = tests.filter((t) => t.flows.includes(flow.id));
  if (!linked.length) return 'open';
  if (linked.some((t) => t.status === 'unexpected')) return 'failed';
  if (linked.some((t) => t.status === 'fixme')) return 'bug';
  if (linked.every((t) => t.status === 'skipped')) return 'open';
  return flow.boundary ? 'partial' : 'full';
};

const ICON = { full: '✅', partial: '🟡', failed: '❌', bug: '🐞', open: '⬜' };
const pct = (n, d) => (d ? `${Math.round((n / d) * 1000) / 10} %` : '–');
const score = (c) => c.full + 0.5 * c.partial;

const areas = manifest.areas.map((area) => {
  const flows = area.flows.map((f) => ({ ...f, status: flowStatus(f) }));
  const c = { full: 0, partial: 0, failed: 0, bug: 0, open: 0 };
  for (const f of flows) c[f.status]++;
  return { ...area, flows, c, total: flows.length };
});
const total = areas.reduce((s, a) => s + a.total, 0);
const sum = areas.reduce(
  (s, a) => { for (const k of Object.keys(s)) s[k] += a.c[k]; return s; },
  { full: 0, partial: 0, failed: 0, bug: 0, open: 0 },
);

// ---- test counts -----------------------------------------------------------------------------
const byProject = (p) => tests.filter((t) => t.project === p);
const count = (list, st) => list.filter((t) => t.status === st).length;
const desktop = byProject('chromium');
const mobile = byProject('mobile');

// ---- code coverage ---------------------------------------------------------------------------
let codeSection = '_Keine Code-Coverage-Daten (Lauf ohne `E2E_COVERAGE=true`)._';
if (existsSync(COVERAGE)) {
  const cov = JSON.parse(readFileSync(COVERAGE, 'utf8'));
  const t = cov.total;
  const loaded = new Set(Object.keys(cov).filter((k) => k !== 'total').map((k) => path.relative(ROOT, k)));
  const srcFiles = [];
  const scan = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = path.join(dir, e);
      if (statSync(p).isDirectory()) scan(p);
      else if (/\.(ts|tsx)$/.test(e) && !/\.(test|spec|d)\.tsx?$/.test(e)) srcFiles.push(path.relative(ROOT, p));
    }
  };
  scan(path.join(ROOT, 'src'));
  const relevant = srcFiles.filter((f) => !f.startsWith('src/types/'));
  const never = relevant.filter((f) => !loaded.has(f)).length;
  codeSection = [
    '| Metrik | Abdeckung | Abgedeckt / Gesamt |',
    '|---|---:|---:|',
    `| Zeilen | ${t.lines.pct} % | ${t.lines.covered} / ${t.lines.total} |`,
    `| Anweisungen | ${t.statements.pct} % | ${t.statements.covered} / ${t.statements.total} |`,
    `| Funktionen | ${t.functions.pct} % | ${t.functions.covered} / ${t.functions.total} |`,
    `| Verzweigungen | ${t.branches.pct} % | ${t.branches.covered} / ${t.branches.total} |`,
    '',
    `Gemessen über die im Browser geladenen Dateien (${loaded.size} von ${relevant.length} Quelldateien unter \`src/\`; ${never} wurden in keinem Test geladen und zählen oben nicht mit).`,
  ].join('\n');
}

// ---- render ----------------------------------------------------------------------------------
const commit = (process.env.GITHUB_SHA ?? '').slice(0, 7);
const date = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const lines = [];
lines.push(START);
lines.push('<!-- Automatisch erzeugt von scripts/e2e-report.mjs (CI: playwright.yml) — nicht von Hand bearbeiten. -->');
lines.push('');
lines.push(`Stand: ${date}${commit ? ` · Commit \`${commit}\`` : ''}`);
lines.push('');
lines.push(`**Funktionsabdeckung: ${pct(score(sum), total)}** (${sum.full} voll + ${sum.partial} teilweise von ${total} Funktionen) · ` +
  `**E2E-Tests:** ${count(desktop, 'expected') + count(desktop, 'flaky')}/${desktop.length} Desktop` +
  `${mobile.length ? `, ${count(mobile, 'expected') + count(mobile, 'flaky')}/${mobile.length} Mobil` : ''} bestanden`);
lines.push('');
lines.push('| Bereich | Funktionen | ✅ voll | 🟡 teilweise | ❌ fehlgeschlagen | 🐞 bekannter Fehler | ⬜ offen | Abdeckung |');
lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
for (const a of areas) {
  lines.push(`| ${a.title} | ${a.total} | ${a.c.full} | ${a.c.partial} | ${a.c.failed} | ${a.c.bug} | ${a.c.open} | ${pct(score(a.c), a.total)} |`);
}
lines.push(`| **Gesamt** | **${total}** | **${sum.full}** | **${sum.partial}** | **${sum.failed}** | **${sum.bug}** | **${sum.open}** | **${pct(score(sum), total)}** |`);
lines.push('');
lines.push('Abdeckung = (voll + ½ · teilweise) / Funktionen. „Teilweise“: die App wird bis zur Grenze nach außen getestet (z. B. Push-Abo gespeichert, Mail-Anfrage gesendet), der externe Dienst selbst ist blockiert.');
lines.push('');
lines.push('<details><summary>Alle Funktionen im Detail</summary>');
lines.push('');
for (const a of areas) {
  lines.push(`**${a.title}**`);
  lines.push('');
  for (const f of a.flows) lines.push(`- ${ICON[f.status]} ${f.title} <sub>\`${f.id}\`</sub>`);
  lines.push('');
}
if (manifest.excluded?.length) {
  lines.push('**Bewusst nicht getestet**');
  lines.push('');
  for (const e of manifest.excluded) lines.push(`- ${e.title} — ${e.reason}`);
  lines.push('');
}
lines.push('</details>');
lines.push('');
const bugs = tests.filter((t) => t.status === 'fixme' && t.project === 'chromium');
lines.push('**Bekannte Fehler (Test als `fixme` markiert)**');
lines.push('');
if (bugs.length) for (const b of bugs) lines.push(`- 🐞 ${b.title} — ${b.fixme ?? ''} <sub>\`${b.file}\`</sub>`);
else lines.push('- keine');
lines.push('');
lines.push('**Code-Abdeckung (E2E, Istanbul)**');
lines.push('');
lines.push(codeSection);
lines.push(END);
const section = lines.join('\n');

if (process.argv.includes('--stdout')) {
  console.log(section);
  process.exit(0);
}

const readme = readFileSync(README, 'utf8');
const s = readme.indexOf(START);
const e = readme.indexOf(END);
if (s === -1 || e === -1) {
  console.error('e2e-report: README markers not found');
  process.exit(1);
}
writeFileSync(README, readme.slice(0, s) + section + readme.slice(e + END.length));
console.log(`e2e-report: README updated — ${pct(score(sum), total)} Funktionsabdeckung.`);
