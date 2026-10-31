/**
 * External tools for the DoD harness — never npm dependencies of this repo. Resolution order:
 * environment variable, then the repo's gitignored .tools/pw (a scratch npm project, or a symlink to the
 * martinadamus checkout's .tools/pw — the global npm registry config on this Mac is broken, see HANDOVER).
 *   TK_LIGHTHOUSE = lighthouse binary      (default .tools/pw/node_modules/.bin/lighthouse, else npx)
 *   TK_PLAYWRIGHT = playwright package dir (default .tools/pw/node_modules/playwright, else SKIP)
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PW_DIRS = [join(REPO, '.tools', 'pw'), join(REPO, '..', 'wordpress-adamus-main', '.tools', 'pw')];

export function lighthouseBin() {
  if (process.env.TK_LIGHTHOUSE) return process.env.TK_LIGHTHOUSE;
  return PW_DIRS.map((d) => join(d, 'node_modules', '.bin', 'lighthouse')).find(existsSync) || null;
}

export function playwrightDir() {
  if (process.env.TK_PLAYWRIGHT) return process.env.TK_PLAYWRIGHT;
  return PW_DIRS.map((d) => join(d, 'node_modules', 'playwright')).find(existsSync) || null;
}
