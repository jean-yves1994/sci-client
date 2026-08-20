#!/usr/bin/env node
/**
 * Repairs the Tone import in components/ui.tsx.
 *
 *   node fix-ui-tone.mjs "C:\path\to\sci-platform\web"
 *   node fix-ui-tone.mjs           (run from inside web/)
 *
 * My previous fixer replaced the local `export type Tone = ...` with:
 *
 *   export type { Tone } from '../lib/tone';
 *
 * That is a re-export. It makes Tone available to modules importing FROM
 * ui.tsx, but it does not bring the name into ui.tsx's own scope — so every
 * internal `Record<Tone, string>` and `tone?: Tone` became TS2304.
 *
 * The correct form is both:
 *
 *   import type { Tone } from '../lib/tone';   // local scope
 *   export type { Tone };                      // and re-export for consumers
 *
 * Verified with real tsc: this is the only variant where ui.tsx's internal uses
 * compile AND other files can still `import type { Tone } from '@/components/ui'`.
 *
 * Idempotent. The original is backed up to ui.tsx.bak before any change.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TARGET = resolve(process.argv[2] ?? process.cwd());

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[90m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const step = (m) => console.log(`\n${c.cyan}${c.bold}==> ${m}${c.reset}`);
const ok = (m) => console.log(`    ${c.green}OK${c.reset}      ${m}`);
const skip = (m) => console.log(`    ${c.dim}--${c.reset}      ${m}`);
const warn = (m) => console.log(`    ${c.yellow}!!${c.reset}      ${m}`);
const bad = (m) => console.log(`    ${c.red}FAIL${c.reset}    ${m}`);

const uiPath = join(TARGET, 'src', 'components', 'ui.tsx');
const tonePath = join(TARGET, 'src', 'lib', 'tone.ts');

if (!existsSync(uiPath)) {
  bad(`Not found: ${uiPath}`);
  console.log('\n    Point this at your web folder, e.g.');
  console.log('      node fix-ui-tone.mjs "C:\\\\My projects\\\\SCI Rwanda\\\\sci-platform\\\\web"\n');
  process.exit(1);
}

console.log(`${c.bold}SCI web — repairing the Tone import in ui.tsx${c.reset}`);
console.log(`${c.dim}${TARGET}${c.reset}`);

// --- 1. make sure the source of truth exists --------------------------------
step('lib/tone.ts');

if (existsSync(tonePath)) {
  ok('src/lib/tone.ts present');
} else {
  writeFileSync(
    tonePath,
    `/**
 * The semantic tone vocabulary, shared by the design system and the formatters.
 *
 * Lives in lib/ rather than components/ui.tsx because ui.tsx carries
 * 'use client': a pure formatting utility should not have to import from a
 * client component merely to name a colour.
 *
 * Semantic rather than literal — 'danger' rather than 'red' — so a status keeps
 * its meaning if the palette is ever restyled.
 */
export type Tone =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'accent';
`,
    'utf8',
  );
  ok('src/lib/tone.ts created');
}

// --- 2. repair ui.tsx -------------------------------------------------------
step('components/ui.tsx');

const before = readFileSync(uiPath, 'utf8');

const CORRECT = "import type { Tone } from '../lib/tone';\nexport type { Tone };";

// Already correct? Needs both the import (scope) and the export (consumers).
const hasImport = /import\s+type\s*\{[^}]*\bTone\b[^}]*\}\s*from\s*['"]\.\.\/lib\/tone['"]/.test(before);
const hasExport = /export\s+type\s*\{\s*Tone\s*\}\s*;/.test(before);

if (hasImport && hasExport) {
  skip('already imports Tone into scope and re-exports it');
  console.log(`\n${'='.repeat(64)}`);
  console.log(`${c.green}${c.bold}Nothing to do.${c.reset}\n`);
  console.log('='.repeat(64) + '\n');
  process.exit(0);
}

let after = before;
let action = '';

// Case 1: the broken re-export my previous fixer inserted.
const reExportOnly = /export\s+type\s*\{\s*Tone\s*\}\s*from\s*['"]\.\.\/lib\/tone['"]\s*;?/;

if (reExportOnly.test(before)) {
  after = before.replace(reExportOnly, CORRECT);
  action = 'replaced the bare re-export with an import plus a re-export';
} else if (/export\s+type\s+Tone\s*=/.test(before)) {
  // Case 2: still the original local definition — replace it.
  after = before.replace(/export\s+type\s+Tone\s*=[\s\S]*?;/, CORRECT);
  action = 'replaced the local definition with an import plus a re-export';
} else if (hasImport && !hasExport) {
  // Case 3: imported but never re-exported; consumers of ui would break.
  after = before.replace(
    /(import\s+type\s*\{[^}]*\bTone\b[^}]*\}\s*from\s*['"]\.\.\/lib\/tone['"];?)/,
    '$1\nexport type { Tone };',
  );
  action = 'added the missing re-export';
} else {
  // Case 4: nothing recognisable — insert after the directive rather than guess.
  const lines = before.split('\n');
  const at = lines[0].includes('use client') ? 1 : 0;
  lines.splice(at, 0, '', CORRECT);
  after = lines.join('\n');
  action = 'inserted the import and re-export near the top';
  warn('no existing Tone declaration found — inserted near the top; check placement');
}

if (after === before) {
  bad('could not rewrite ui.tsx — apply the two lines by hand:');
  console.log(`\n      ${CORRECT.split('\n').join('\n      ')}\n`);
  process.exit(1);
}

copyFileSync(uiPath, `${uiPath}.bak`);
writeFileSync(uiPath, after, 'utf8');
ok(action);
ok('original saved as ui.tsx.bak');

// --- 3. report -------------------------------------------------------------
step('Result');

const internalUses = (after.match(/\bTone\b/g) ?? []).length;
console.log(`    ${c.dim}Tone now appears ${internalUses} time(s) in ui.tsx, all resolvable:`);
console.log(`    ${c.dim}  import  -> brings it into local scope (fixes the TS2304s)`);
console.log(`    ${c.dim}  export  -> keeps '@/components/ui' imports working elsewhere${c.reset}`);

console.log(`\n${'='.repeat(64)}`);
console.log(`${c.green}${c.bold}Done.${c.reset}\n`);
console.log('Now run:');
console.log(`  cd "${TARGET}"`);
console.log('  npm run typecheck\n');
console.log('='.repeat(64) + '\n');
