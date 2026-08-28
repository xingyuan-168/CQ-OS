import assert from 'node:assert'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  patternMatches, normalizePath, normalizeCommand, shellSignature,
  loadProjectPaths, loadRoles, loadGates,
  effectiveGuard, approvalGated, cannotMap, MUTATING_TOOLS,
} from '../preset/plugins/cq-governance/lib/policy.js'
import { createRoleRegistry, UNKNOWN, roleFromToolName } from '../preset/plugins/cq-governance/lib/roles.js'
import { guardDecision, gatesDecision, opFromExec } from '../preset/plugins/cq-governance/lib/core.js'

// ── a. shell literal signature hits ────────────────────────────────────────
{
  const c1 = normalizeCommand('echo x > preset/f')
  const c2 = normalizeCommand('Set-Content .cq\\policy\\gates.yml x')
  assert.ok(c1.includes(shellSignature('preset/**')), 'shell literal: preset/ hit')
  assert.ok(c2.includes(shellSignature('.cq/policy/**')), 'shell literal: .cq/policy/ hit')
  assert.ok(normalizeCommand('echo SECRET > .env').includes('.env'), 'shell literal: .env hit')
  assert.ok(normalizeCommand('rm -rf credentials/k').includes('credentials/'), 'shell literal: credentials/ hit')
  assert.ok(normalizeCommand('Remove-Item .dsh\\settings -Recurse').includes('.dsh/'), 'shell literal: .dsh/ hit')
}

// ── b. over-block on read-only command is a KNOWN, recorded cost ───────────
{
  const c = normalizeCommand('ls preset/')
  assert.ok(c.includes(shellSignature('preset/**')), 'over-block: `ls preset/` hits the literal signature (recorded cost, ADR-0025 §2)')
}

// ── c. variable expansion is NOT caught (A2 residual, recorded) ────────────
{
  const c = normalizeCommand('echo x > $P/f')
  assert.ok(!c.includes('preset/'), 'A2 residual: variable-expanded path is not caught (documented gap)')
}

// ── d. cannot category mapping ─────────────────────────────────────────────
{
  assert.equal(cannotMap('modify-governance-rules', { tool: 'write', path: '.cq/policy/x.yml' })?.decision, 'deny', 'gov-rules write -> deny')
  assert.equal(cannotMap('delete-core-data', { tool: 'pwsh', command: 'rm -rf .cq/x' })?.decision, 'ask', 'delete-core-data rm -> ask')
  assert.equal(cannotMap('modify-production', { tool: 'pwsh', command: 'git push origin main' })?.decision, 'ask', 'production push -> ask')
  assert.equal(cannotMap('modify-governance-rules', { tool: 'write', path: 'src/app.js' }), null, 'gov-rules on normal path -> no match')
}

// ── e. mode merge: effectiveGuard / approvalGated ──────────────────────────
{
  const rt = effectiveGuard('runtime')
  const mt = effectiveGuard('maintenance')
  assert.ok(rt.includes('preset/**') && rt.includes('.cq/policy/**'), 'runtime guards preset & policy')
  assert.ok(!mt.includes('preset/**') && !mt.includes('.cq/policy/**'), 'maintenance lifts preset & policy from guard')
  assert.ok(mt.includes('**.env') && mt.includes('.dsh/**'), 'maintenance still hard-denies env & dsh')
  assert.ok(approvalGated('maintenance').includes('.cq/policy/**'), 'maintenance approval-gates governance rules')
  assert.equal(approvalGated('runtime').length, 0, 'runtime has no approval-gated set')
}

// ── f. role registry: UNKNOWN fail-closed, tester known ────────────────────
{
  assert.equal(roleFromToolName('subagent_tester'), 'tester', 'toolName -> role')
  assert.equal(roleFromToolName('subagent'), UNKNOWN, 'non-role tool -> UNKNOWN')
  const r = createRoleRegistry()
  assert.equal(r.roleOf({}), UNKNOWN, 'no agent -> UNKNOWN')
  assert.equal(r.roleOf({ agent: { delegationDepth: 0 } }), 'core', 'root -> core')
  r.observeSpawn('subagent_tester')
  assert.equal(r.correlateStart({ childSessionId: 's1' }), 'tester', 'FIFO correlation -> tester')
  assert.equal(r.roleOf({ agent: { delegationDepth: 1, sessionId: 's1' } }), 'tester', 'child session -> tester')
  const r2 = createRoleRegistry()
  r2.observeSpawn('subagent_developer')
  r2.observeSpawn('subagent_tester')
  assert.equal(r2.correlateStart({ childSessionId: 'x' }), UNKNOWN, 'ambiguous FIFO -> UNKNOWN')
}

// ── g/h/i. fail-closed three-state + roles/gates parsing ───────────────────
{
  const absent = join(tmpdir(), 'cq-policy-absent-' + Date.now())
  assert.deepEqual(loadProjectPaths(absent), [], 'absent protected-paths -> []')

  const badDir = mkdtempSync(join(tmpdir(), 'cq-policy-invalid-'))
  writeFileSync(join(badDir, 'protected-paths.yml'), 'garbage: [')
  assert.throws(() => loadProjectPaths(badDir), /protected-paths policy invalid/, 'malformed protected-paths -> throw')
  rmSync(badDir, { recursive: true, force: true })

  // Real workspace policies (regression for the loadRoles section regex fix).
  const roles = loadRoles('.cq/policy')
  assert.equal(roles.tester.canWrite, false, 'roles.yml tester canWrite=false')
  assert.equal(roles.developer.canExecuteCommand, true, 'roles.yml developer canExecuteCommand=true')
  assert.ok(roles.developer.cannot.includes('modify-governance-rules'), 'roles.yml developer cannot parsed')
  const gates = loadGates('.cq/policy')
  assert.ok(gates['production-release'] && gates['dangerous-ops'] && gates['governance-rule-change'], 'gates.yml all gates parsed')
}

// ── j. guardDecision: mutating-only branch A; read tool unaffected ─────────
{
  const eff = effectiveGuard('runtime')
  const exec = (name, args) => ({ name, arguments: args })
  assert.ok(guardDecision(exec('write', { file_path: 'preset/x' }), { mode: 'runtime', effective: eff }), 'write preset -> deny')
  assert.ok(guardDecision(exec('edit', { file_path: '.env' }), { mode: 'runtime', effective: eff }), 'edit .env -> deny')
  assert.equal(guardDecision(exec('read', { file_path: 'preset/agent.cordis.yml' }), { mode: 'runtime', effective: eff }), undefined, 'read of protected path -> allowed (read-only tool)')
  assert.ok(guardDecision(exec('pwsh', { command: 'echo x > preset/f' }), { mode: 'runtime', effective: eff }), 'shell literal -> deny')
  assert.ok(guardDecision(exec('pwsh', { command: 'ls', workdir: '.dsh/x' }), { mode: 'runtime', effective: eff }), 'shell workdir -> deny')
  assert.equal(guardDecision(exec('write', { file_path: 'src/app.js' }), { mode: 'runtime', effective: eff }), undefined, 'normal path -> allow')
}

// ── k. gatesDecision never auto-asks on ordinary mutating tools ────────────
{
  const gates = loadGates('.cq/policy')
  const op = { tool: 'write', path: 'docs/x.md' }
  assert.equal(gatesDecision(gates, op), null, 'no over-gating of ordinary writes')
}

console.log(JSON.stringify({ ok: true, shellLiteral: true, overBlockRecorded: true, a2ResidualRecorded: true, cannotMap: true, modeMerge: true, roleRegistry: true, failClosed: true, guardMutatingOnly: true, checks: 10 }))
