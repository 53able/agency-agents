#!/usr/bin/env node

import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const DEFAULT_SOURCE_DIRS = [
  'academic',
  'design',
  'engineering',
  'finance',
  'game-development',
  'gis',
  'marketing',
  'paid-media',
  'product',
  'project-management',
  'sales',
  'security',
  'spatial-computing',
  'specialized',
  'support',
  'testing',
];

const targetRoot = process.cwd();
const sourceRoot = resolve(process.argv[2] ?? targetRoot);

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeName(value) {
  return value.toLowerCase().replace(/[\s_]+/g, '-');
}

function frontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readSourceDirs(root) {
  const divisionsPath = join(root, 'divisions.json');
  if (!(await exists(divisionsPath))) return DEFAULT_SOURCE_DIRS;

  const parsed = JSON.parse(await readFile(divisionsPath, 'utf8'));
  return Object.keys(parsed.divisions ?? {});
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path);
    }
  }

  return files;
}

async function readSkillFiles(root) {
  const sourceDirs = await readSourceDirs(root);
  const skills = [];

  for (const sourceDir of sourceDirs) {
    const dir = join(root, sourceDir);
    if (!(await exists(dir))) continue;

    for (const file of await walk(dir)) {
      const content = await readFile(file, 'utf8');
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) continue;

      const name = frontmatterValue(match[1], 'name');
      const description = frontmatterValue(match[1], 'description');
      if (!name || !description) continue;

      skills.push({
        file,
        name,
        normalizedName: normalizeName(name),
        slug: slugify(name),
        content,
      });
    }
  }

  return skills;
}

const skills = await readSkillFiles(sourceRoot);

if (skills.length === 0) {
  throw new Error(
    `No upstream agent markdown files found in ${sourceRoot}. Pass a checkout of msitarzewski/agency-agents, for example: npm run sync:upstream -- ../agency-agents-upstream`
  );
}

const byName = new Map();
for (const skill of skills) {
  const existing = byName.get(skill.normalizedName);
  if (existing) {
    throw new Error(`Duplicate skill name "${skill.name}" in ${existing.file} and ${skill.file}`);
  }
  byName.set(skill.normalizedName, skill);
}

const bySlug = new Map();
for (const skill of skills) {
  const existing = bySlug.get(skill.slug);
  if (existing) {
    throw new Error(`Duplicate skill slug "${skill.slug}" from ${existing.file} and ${skill.file}`);
  }
  bySlug.set(skill.slug, skill);
}

const skillsDir = join(targetRoot, 'skills');
await rm(skillsDir, { recursive: true, force: true });

for (const skill of skills.sort((a, b) => a.slug.localeCompare(b.slug))) {
  const target = join(skillsDir, skill.slug, 'SKILL.md');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, skill.content, 'utf8');
}

console.log(`Synced ${skills.length} upstream agents from ${sourceRoot} to skills/<slug>/SKILL.md.`);
