#!/usr/bin/env node
// CQ OS security check automation (V2 §二十二 / Final Hardening).
// Detects the project stack, detects available scanners, runs whatever is
// available for the detected stack, and normalizes the outcome. It NEVER
// installs a scanner — absent scanner -> SKIPPED_WITH_REASON (not an error).
//
// Exit code: 0 when checks ran clean or were skipped with a reason;
// 1 when an available scanner reported findings.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const REPO = resolve(process.cwd())

function has(cmd) {
  try { execFileSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }); return true } catch { return false }
}

function run(args, cwd = REPO) {
  try { return { ok: true, out: execFileSync(args[0], args.slice(1), { encoding: 'utf8', cwd, maxBuffer: 4 * 1024 * 1024, timeout: 30000 }).trim() } }
  catch (err) { return { ok: false, out: String(err?.stdout || err?.stderr || err?.message || err).trim().slice(0, 400) } }
}

// Stack detection
const stack = []
if (existsSync(resolve(REPO, 'package.json'))) stack.push('node')
if (existsSync(resolve(REPO, 'requirements.txt')) || existsSync(resolve(REPO, 'pyproject.toml'))) stack.push('python')
if (existsSync(resolve(REPO, 'Cargo.toml'))) stack.push('rust')
if (existsSync(resolve(REPO, 'go.mod'))) stack.push('go')
const stackLabel = stack.length ? stack.join(',') : 'unknown'

// Available scanner detection
const available = []
const candidates = [
  { name: 'npm-audit', has: () => stack.includes('node') && has('npm'), run: () => run(['npm', 'audit', '--omit=dev', '--json']) },
  { name: 'pip-audit', has: () => stack.includes('python') && has('pip-audit'), run: () => run(['pip-audit']) },
  { name: 'cargo-audit', has: () => stack.includes('rust') && has('cargo-audit'), run: () => run(['cargo', 'audit']) },
  { name: 'gitleaks', has: () => has('gitleaks'), run: () => run(['gitleaks', 'detect', '--no-banner']) },
  { name: 'osv-scanner', has: () => has('osv-scanner'), run: () => run(['osv-scanner', '-r', '.']) },
  { name: 'semgrep', has: () => has('semgrep'), run: () => run(['semgrep', 'scan', '--quiet', '--json']) },
  { name: 'trivy', has: () => has('trivy'), run: () => run(['trivy', 'fs', '--scanners', 'misconfig,secret', '--quiet', '.']) },
]

const results = []
let findings = 0
for (const c of candidates) {
  if (c.has()) {
    available.push(c.name)
    const r = c.run()
    const clean = r.ok || /0 vulnerabilities|no known vulnerabilities|No issues|No vulnerabilities found/i.test(r.out)
    if (!clean) findings += 1
    results.push({ scanner: c.name, ran: true, clean, summary: r.out.slice(0, 300) })
  } else {
    results.push({ scanner: c.name, ran: false, reason: 'not installed (never auto-installed)' })
  }
}

const scanned = results.filter((r) => r.ran).length
console.log(JSON.stringify({ ok: findings === 0, stack: stackLabel, available: available, scannersScanned: scanned, results }, null, 2))
if (findings > 0) process.exitCode = 1
