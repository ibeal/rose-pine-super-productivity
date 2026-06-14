#!/usr/bin/env node
/**
 * Build the distributable theme files from the unified contract template.
 *
 * `src/template.css` is a single set of `body` variable declarations whose
 * values are Rosé Pine palette variables (`$base`, `$rose`, …) and per-variant
 * selectors (`$(main|moon|dawn)`). It is run through @rose-pine/build, which
 * emits one resolved block per variant:
 *
 *   rose-pine       -> the Main dark palette block
 *   rose-pine-moon  -> the Moon dark palette block
 *   rose-pine-dawn  -> the Dawn light palette block
 *
 * Each distributable theme is then assembled in order from:
 *   1. a generated header comment
 *   2. src/base.css        (shadow reset + transitions, shared)
 *   3. the dark block       (wrapped in `body.isDarkTheme`)
 *   4. the Dawn light block  (wrapped in `body:not(.isDarkTheme)`)
 *   5. src/contract.css    (theme contract + shared vars + rules, shared)
 */

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { build as rosePineBuild } from '@rose-pine/build';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const blocks = join(dist, '.blocks');

/** The two distributable themes and the dark variant each pairs with Dawn. */
const TARGETS = [
  {
    output: 'rose-pine.css',
    darkVariant: 'rose-pine',
    darkLabel: 'Rosé Pine',
    lightLabel: 'Rosé Pine Dawn',
    title: 'Rosé Pine Adaptive Theme for Super Productivity',
  },
  {
    output: 'rose-pine-moon.css',
    darkVariant: 'rose-pine-moon',
    darkLabel: 'Rosé Pine Moon',
    lightLabel: 'Rosé Pine Dawn',
    title: 'Rosé Pine Moon Adaptive Theme for Super Productivity',
  },
];

const trim = (s) => s.replace(/^\n+/, '').replace(/\s+$/, '');

const read = async (...parts) => trim(await readFile(join(...parts), 'utf8'));

const sectionComment = (label) =>
  [
    '/* ===============================',
    ` * ${label}`,
    ' * ===============================*/',
  ].join('\n');

const header = (t) =>
  [
    '/**',
    ` * ${t.title}`,
    ` * Dark mode: ${t.darkLabel}`,
    ` * Light mode: ${t.lightLabel}`,
    ' */',
  ].join('\n');

const wrapBlock = (comment, selector, decls) =>
  `${sectionComment(comment)}\n\n${selector} {\n${decls}\n}`;

async function build() {
  // 1. Resolve the unified template into one block per variant.
  await mkdir(blocks, { recursive: true });
  await rosePineBuild({ template: join(src, 'template.css'), output: blocks, __skipReadmeVersion: true });

  // 2. Read the shared partials and the resolved variant blocks.
  const [base, contract, dawnDecls] = await Promise.all([
    read(src, 'base.css'),
    read(src, 'contract.css'),
    read(blocks, 'rose-pine-dawn.css'),
  ]);
  const dawn = wrapBlock(
    `LIGHT MODE: ${TARGETS[0].lightLabel.toUpperCase()}`,
    'body:not(.isDarkTheme)',
    dawnDecls,
  );

  // 3. Assemble each adaptive theme: dark variant block + shared Dawn block.
  await mkdir(dist, { recursive: true });
  for (const target of TARGETS) {
    const darkDecls = await read(blocks, `${target.darkVariant}.css`);
    const dark = wrapBlock(`DARK MODE: ${target.darkLabel.toUpperCase()}`, 'body.isDarkTheme', darkDecls);
    const css = [header(target), base, dark, dawn, contract].join('\n\n') + '\n';
    await writeFile(join(dist, target.output), css, 'utf8');
    console.log(`built dist/${target.output}`);
  }

  // 4. Drop the intermediate per-variant blocks.
  await rm(blocks, { recursive: true, force: true });
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
