#!/usr/bin/env node
// CQ OS unified test/validation entry (V2 §二十七 / Final Hardening).
// `npm test` -> `node tools/test-all.mjs`.
// Fatal: all test-*.mjs + deadname scan (cq-os + maintenance) + project-init dry-run.
// Informational (reported, non-fatal): security-check, maint-preflight.

import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const REPO = resolve(process.cwd())
const TOOLS = join(REPO, 'tools')

function run(args) {
  try {
    const out = execFileSync(args[0], args.slice(1), { encoding: 'utf8', cwd: REPO, maxBuffer: 8 * 1024 * 1024, timeout: 90000 }).trim()
    return { pass: true, out }
  } catch (err) {
    return { pass: false, out: String(err?.stdout || err?.stderr || err?.message || err).trim().slice(0, 400) }
  }
}

const rows = []
const tests = readdirSync(TOOLS).filter((f) => /^test-.*\.mjs$/.test(f) && f !== 'test-all.mjs').sort()
for (const t of tests) {
  const r = run(['node', join('tools', t)])
  rows.push({ item: t, pass: r.pass, info: false })
}
const dead = run(['node', join('tools', 'check-toolfilter-deadnames.mjs'), join('preset', 'agent.cordis.yml'), join('preset', 'maintenance', 'agent.cordis.yml')])
rows.push({ item: 'deadnames(cq-os+maint)', pass: dead.pass, info: false })
const init = run(['node', join('tools', 'cq-project-init.mjs'), '--target', join(process.env.TEMP || '.', 'cq-test-all-dry'), '--name', 'test', '--dry-run'])
rows.push({ item: 'project-init(dry-run)', pass: init.pass, info: false })
const security = run(['node', join('tools', 'cq-security-check.mjs')])
rows.push({ item: 'security-check', pass: security.pass, info: true })
const preflight = run(['node', join('tools', 'cq-maint-preflight.mjs'), '--skip-tests'])
rows.push({ item: 'maint-preflight(skip-tests)', pass: preflight.pass, info: true })

const fatalFailures = rows.filter((r) => !r.info && !r.pass)
const infoFailures = rows.filter((r) => r.info && !r.pass)
console.log(JSON.stringify({ ok: fatalFailures.length === 0, total: rows.length, fatalFailures: fatalFailures.map((r) => r.item), infoFailures: infoFailures.map((r) => r.item), rows }, null, 2))
if (fatalFailures.length) process.exitCode = 1
