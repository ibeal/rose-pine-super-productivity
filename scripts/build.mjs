#!/usr/bin/env node
/**
 * Build the distributable theme files from the source partials in `src/`.
 *
 * Each output file is assembled in order from:
 *   1. a generated header comment
 *   2. src/base.css        (shadow reset + transitions, shared)
 *   3. src/themes/<dark>   (the dark-mode palette block for this variant)
 *   4. src/themes/dawn.css (the light-mode palette block, shared)
 *   5. src/contract.css    (theme contract + shared vars + rules, shared)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');

/** The two distributable themes and how they are composed. */
const TARGETS = [
  {
    output: 'rose-pine.css',
    dark: 'main',
    darkLabel: 'Rosé Pine',
    lightLabel: 'Rosé Pine Dawn',
    title: 'Rosé Pine Adaptive Theme for Super Productivity',
  },
  {
    output: 'rose-pine-moon.css',
    dark: 'moon',
    darkLabel: 'Rosé Pine Moon',
    lightLabel: 'Rosé Pine Dawn',
    title: 'Rosé Pine Moon Adaptive Theme for Super Productivity',
  },
];

const trim = (s) => s.replace(/^\n+/, '').replace(/\s+$/, '');

const read = async (...parts) => trim(await readFile(join(src, ...parts), 'utf8'));

const header = (t) =>
  [
    '/**',
    ` * ${t.title}`,
    ` * Dark mode: ${t.darkLabel}`,
    ` * Light mode: ${t.lightLabel}`,
    ' */',
  ].join('\n');

async function build() {
  const [base, dawn, contract] = await Promise.all([
    read('base.css'),
    read('themes', 'dawn.css'),
    read('contract.css'),
  ]);

  for (const target of TARGETS) {
    const dark = await read('themes', `${target.dark}.css`);
    const css = [header(target), base, dark, dawn, contract].join('\n\n') + '\n';
    await writeFile(join(root, target.output), css, 'utf8');
    console.log(`built ${target.output}`);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
