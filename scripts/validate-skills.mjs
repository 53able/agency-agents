#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

const root = process.cwd();
const skillsDir = join(root, 'skills');
const required = ['name', 'description'];
let errors = 0;
const names = new Map();

function error(message) {
  console.error(`ERROR: ${message}`);
  errors += 1;
}

function normalizeName(value) {
  return value.toLowerCase().replace(/[\s_]+/g, '-');
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function frontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
}

try {
  if (!(await stat(skillsDir)).isDirectory()) {
    error('skills/ is not a directory');
  }
} catch {
  error('skills/ directory is missing');
}

const entries = await readdir(skillsDir, { withFileTypes: true }).catch(() => []);
const skillDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

for (const dir of skillDirs) {
  const skillPath = join(skillsDir, dir, 'SKILL.md');
  let content;

  try {
    content = await readFile(skillPath, 'utf8');
  } catch {
    error(`skills/${dir}/SKILL.md is missing`);
    continue;
  }

  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    error(`skills/${dir}/SKILL.md is missing YAML frontmatter`);
    continue;
  }

  for (const key of required) {
    if (!frontmatterValue(match[1], key)) {
      error(`skills/${dir}/SKILL.md is missing frontmatter field "${key}"`);
    }
  }

  const name = frontmatterValue(match[1], 'name');
  if (!name) continue;

  const normalized = normalizeName(name);
  if (names.has(normalized)) {
    error(`duplicate skill name "${name}" in skills/${dir} and skills/${names.get(normalized)}`);
  } else {
    names.set(normalized, dir);
  }

  const expectedDir = slugify(name);
  if (basename(dir) !== expectedDir) {
    error(`skills/${dir} should be named skills/${expectedDir} based on frontmatter name`);
  }
}

if (skillDirs.length === 0) {
  error('no skills found under skills/');
}

if (errors > 0) {
  console.error(`Validation failed with ${errors} error(s).`);
  process.exit(1);
}

console.log(`Validated ${skillDirs.length} skills.`);
