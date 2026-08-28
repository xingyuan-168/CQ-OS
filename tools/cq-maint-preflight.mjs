#!/usr/bin/env node
// CQ OS maintenance preflight (V2 §十七 / Final Hardening). Automated pre-deploy
// checks a maintenance session can run before touching the deployment.
//   - git-clean check
//   - regression suite run (all tools/test-*.mjs)
//   - preset source <-> deployed preset drift (file-hash diff)
//   - deploy preparation (what WOULD be copied, dry-run)
//   - rollback path (safe git point)
// Human-approval steps are listed as PENDING_USER_APPROVAL and never executed.

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const REPO = resolve(process.cwd())
const PRESET = join(REPO, 'preset')
const HOME = process.env.USERPROFILE || process.env.HOME || ''
const DEPLOYED = {
  cqOs: join(HOME, '.dsh', '.agent-presets', 'cq-os'),
  cqOsMaint: join(HOME, '.dsh', '.agent-presets', 'cq-os-maint'),
}

function sh(args, opts = {}) {
  try {
    return { ok: true, out: execFileSync(args[0], args.slice(1), { encoding: 'utf8', cwd: REPO, ...opts }).trim() }
  } catch (err) {
    return { ok: false, out: String(err?.stderr || err?.message || err).trim() }
  }
}

function hashFile(file) {
  try {
    const data = readFileSync(file)
    return createHash('sha256').update(data).digest('hex')
  } catch { return null }
}

function collectFiles(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collectFiles(full, base, out)
    else out.push(full)
  }
  return out
}

// 1. git clean
const git = sh(['git', 'status', '--porcelain'])
const gitClean = git.ok && git.out === ''

// 2. regression suite (skipped with --skip-tests, e.g. when invoked from test-all)
const skipTests = process.argv.includes('--skip-tests')
const testResults = []
let testFailures = 0
if (!skipTests) {
  const tests = readdirSync(join(REPO, 'tools')).filter((f) => /^test-.*\.mjs$/.test(f) && f !== 'test-all.mjs').sort()
  for (const t of tests) {
    const r = sh(['node', join('tools', t)])
    testResults.push({ test: t, pass: r.ok })
    if (!r.ok) testFailures += 1
  }
}

// 3. preset <-> deployed drift
const drift = []
const srcFiles = collectFiles(PRESET)
const mappings = [
  { src: PRESET, dst: DEPLOYED.cqOs, name: 'cq-os' },
  { src: join(PRESET, 'maintenance'), dst: DEPLOYED.cqOsMaint, name: 'cq-os-maint' },
]
for (const m of mappings) {
  if (!existsSync(m.dst)) { drift.push({ preset: m.name, file: '(missing deployment dir)', state: 'MISSING' }); continue }
  for (const f of collectFiles(m.src)) {
    const rel = f.slice(m.src.length).replace(/^[\\/]/, '')
    const dstFile = join(m.dst, rel)
    const a = hashFile(f)
    const b = hashFile(dstFile)
    if (a !== b) drift.push({ preset: m.name, file: rel, state: 'DRIFT' })
  }
}

// 4. deploy preparation (dry-run description only)
const deployPrep = [
  'plugin: preset/plugins/cq-governance/* -> profile node_modules/@cq/governance (web + desktop + %LOCALAPPDATA%/Temp/cq-governance)',
  'preset: cq-os agent.cordis.yml/preset.yml/VERSION/skills/templates -> .agent-presets/cq-os',
  'preset: maintenance agent.cordis.yml/preset.yml/VERSION/skills -> .agent-presets/cq-os-maint',
]

// 5. rollback path
const head = sh(['git', 'log', '-1', '--oneline'])
const rollback = head.ok ? head.out : '(no git history)'

const result = {
  ok: gitClean && testFailures === 0 && drift.length === 0,
  gitClean,
  gitStatus: gitClean ? 'clean' : 'DIRTY (see git status)',
  regression: { total: testResults.length, failures: testFailures, results: testResults },
  presetDeployDrift: drift,
  deployPrep,
  rollbackPath: rollback,
  pendingUserApproval: ['deploy to DSH user preset directory', 'force/reset/destructive git ops', 'production release', 'modify governance rules'],
}
console.log(JSON.stringify(result, null, 2))
if (!result.ok) process.exitCode = 1
