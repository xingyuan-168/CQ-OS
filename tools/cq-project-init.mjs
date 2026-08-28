#!/usr/bin/env node
// CQ OS minimal project initializer (V2 §二十 / Final Hardening).
// Generates a minimal project skeleton from preset/templates/project-init.
// Fail-closed: refuses to touch a non-empty existing target unless --force.
// --dry-run prints what would be created without writing or git init.
// Git is the only version control; if git is unavailable -> BLOCKED (never a
// manual snapshot / duplicate tree).

import { mkdirSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const TEMPLATE = fileURLToPath(new URL('../preset/templates/project-init', import.meta.url))

function parseArgs(argv) {
  const opts = { target: null, name: null, dryRun: false, force: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--target') opts.target = argv[++i]
    else if (a === '--name') opts.name = argv[++i]
    else if (a === '--dry-run') opts.dryRun = true
    else if (a === '--force') opts.force = true
    else opts.target = a
  }
  return opts
}

function writeOut(file, content) {
  mkdirSync(resolve(file, '..'), { recursive: true })
  writeFileSync(file, content)
}

const opts = parseArgs(process.argv.slice(2))
if (!opts.target) {
  console.log(JSON.stringify({ ok: false, errors: ['--target <dir> is required'] }, null, 2))
  process.exitCode = 1
  process.exit(1)
}
const target = resolve(opts.target)
const name = opts.name || resolve(target).split(/[\\/]/).pop() || 'project'

// Fail-closed: non-empty existing target requires --force.
if (existsSync(target) && readdirSync(target).length > 0 && !opts.force) {
  console.log(JSON.stringify({ ok: false, errors: [`target is not empty: ${target} (use --force to overwrite into it)`] }, null, 2))
  process.exitCode = 1
  process.exit(1)
}

// Git availability check (fail-closed; no manual snapshots).
let gitAvailable = true
try { execFileSync('git', ['--version'], { stdio: 'ignore' }) } catch { gitAvailable = false }
if (!gitAvailable) {
  console.log(JSON.stringify({ ok: false, blocked: true, reason: 'git unavailable — init BLOCKED (no manual snapshots allowed)' }, null, 2))
  process.exitCode = 1
  process.exit(1)
}

const files = {
  '.gitignore': '.gitignore.template',
  'README.md': 'README.md',
  'docs/README.md': 'docs/README.md',
  'Dockerfile': 'Dockerfile.template',
  'docker-compose.yml': 'docker-compose.yml.template',
  '.cq/project.md': null,
}
const ciSrc = join(TEMPLATE, 'ci', '.github', 'workflows', 'ci.yml')

const plan = []
for (const [rel, tmpl] of Object.entries(files)) {
  if (tmpl && existsSync(join(TEMPLATE, tmpl))) plan.push({ file: rel, source: tmpl })
  else if (rel === '.cq/project.md') plan.push({ file: rel, source: 'generated' })
}
plan.push({ file: 'ci/.github/workflows/ci.yml', source: 'ci/.github/workflows/ci.yml' })

if (opts.dryRun) {
  console.log(JSON.stringify({ ok: true, dryRun: true, target, name, files: plan.map((p) => p.file) }, null, 2))
  process.exit(0)
}

const created = []
for (const p of plan) {
  const dst = join(target, p.file)
  if (p.source === 'generated') {
    writeOut(dst, `---\nid: project\ntype: project\nstatus: active\ntitle: ${name}\n---\n\n# ${name}\n`)
  } else {
    mkdirSync(resolve(dst, '..'), { recursive: true })
    copyFileSync(join(TEMPLATE, p.source), dst)
  }
  created.push(p.file)
}
execFileSync('git', ['init'], { cwd: target, stdio: 'ignore' })
created.push('.git (git init)')

console.log(JSON.stringify({ ok: true, target, name, created }, null, 2))
