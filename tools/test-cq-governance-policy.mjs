import assert from 'node:assert'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve as pathResolve } from 'node:path'
import {
  patternMatches, normalizePath, normalizeCommand, shellSignature,
  loadProjectPaths, loadRoles, loadGates, loadPolicy,
  effectiveGuard, approvalGated, cannotMap, MUTATING_TOOLS,
  effectiveRoles, effectiveGates, BASELINE_ROLES,
} from '../preset/plugins/cq-governance/lib/policy.js'
import { createRoleRegistry, UNKNOWN, roleFromToolName } from '../preset/plugins/cq-governance/lib/roles.js'
import { guardDecision, gatesDecision, opFromExec, apply, makePolicyLoader } from '../preset/plugins/cq-governance/lib/core.js'

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

// ── l. P0-1: missing tools.guard -> fail-closed throw (not silent skip) ───
{
  const noGuardCtx = { get: () => undefined, effect() {}, on() {} }
  assert.throws(() => apply(noGuardCtx, { mode: 'runtime', policyDir: '.cq/policy' }), /tools.guard unavailable/, 'P0-1: missing guard throws')
}

// ── m. P0-5/P0-6: baseline roles non-relaxable; core included ─────────────
{
  const relaxed = effectiveRoles({ tester: { canWrite: true }, developer: { canWrite: false } })
  assert.equal(relaxed.tester.canWrite, false, 'P0-6: project cannot raise tester canWrite above baseline false')
  assert.equal(relaxed.developer.canWrite, false, 'P0-6: project can lower developer canWrite to false')
  assert.ok(relaxed.developer.cannot.includes('modify-governance-rules'), 'P0-6: baseline cannot preserved')
  assert.equal(relaxed.core.canWrite, true, 'P0-5: core baseline canWrite true')
  assert.ok(relaxed.core.cannot.includes('modify-governance-rules'), 'P0-5: core baseline cannot')
}

// ── n. P0-7: baseline gates cannot be cancelled; project adds on top ──────
{
  const merged = effectiveGates({ 'production-release': { description: 'x', tool: 'ask_user_question' }, 'project-only': { description: 'p', tool: 'ask_user_question' } })
  assert.ok(merged['production-release'] && merged['dangerous-ops'] && merged['governance-rule-change'], 'P0-7: baseline gates present')
  assert.ok(merged['project-only'], 'P0-7: project gate added')
}

// ── o. P0-8: policy.yml runtime load; absent -> baseline defaults ──────────
{
  const p = loadPolicy('.cq/policy')
  assert.equal(p.failClosed, true, 'P0-8: policy.yml failClosed=true')
  assert.equal(p.defaultDeny, true, 'P0-8: policy.yml defaultDeny=true')
  assert.equal(p.policyVersion, 1, 'P0-8: policy.yml schemaVersion 1')
  assert.equal(loadPolicy(join(tmpdir(), 'no-policy-' + Date.now())).failClosed, true, 'P0-8: absent policy.yml -> failClosed default true')
  // §十一: baseline invariant cannot be relaxed by project.
  const relaxed = mkdtempSync(join(tmpdir(), 'cq-policy-relax-'))
  writeFileSync(join(relaxed, 'policy.yml'), 'schemaVersion: 1\ndefaultDeny: true\nfailClosed: false\n')
  assert.throws(() => loadPolicy(relaxed), /cannot relax baseline failClosed/, '§11: project failClosed:false -> throw')
  rmSync(relaxed, { recursive: true, force: true })
}

// ── p. P0-4: roleRegistry wiring (subagent/start info.id -> child role) ───
{
  const ons = {}
  const ctx = { get: (n) => n === 'tools' ? { guard: () => () => {} } : undefined, effect() {}, on(ev, fn) { ons[ev] = fn } }
  const r = apply(ctx, { mode: 'runtime', policyDir: '.cq/policy' })
  r.registry.observeSpawn('subagent_tester')
  ons['subagent/start']({ id: 'child-1' })
  assert.equal(r.registry.roleOf({ agent: { session: { header: { id: 'child-1' } }, delegationDepth: 1 } }), 'tester', 'P0-4: subagent/start info.id -> tester')
}

// ── q. P0-2: policy loader binds to exec workspace; cached per root ───────
{
  const aDir = mkdtempSync(join(tmpdir(), 'cq-ws-a-'))
  const bDir = mkdtempSync(join(tmpdir(), 'cq-ws-b-'))
  mkdirSync(join(aDir, '.cq', 'policy'), { recursive: true })
  mkdirSync(join(bDir, '.cq', 'policy'), { recursive: true })
  writeFileSync(join(aDir, '.cq', 'policy', 'protected-paths.yml'), 'schemaVersion: 1\nprotected:\n  - "preset/**"\n  - "projectA-only/**"\n')
  writeFileSync(join(bDir, '.cq', 'policy', 'protected-paths.yml'), 'schemaVersion: 1\nprotected:\n  - "preset/**"\n  - "projectB-only/**"\n')
  const loader = makePolicyLoader({ policyDir: '.cq/policy' })
  const a = loader({ agent: { session: { header: { cwd: aDir } } } })
  const b = loader({ agent: { session: { header: { cwd: bDir } } } })
  assert.ok(a.effective.includes('projectA-only/**') && !a.effective.includes('projectB-only/**'), 'P0-2: workspace A reads only A policy')
  assert.ok(b.effective.includes('projectB-only/**') && !b.effective.includes('projectA-only/**'), 'P0-2: workspace B reads only B policy')
  assert.equal(loader({ agent: { session: { header: { cwd: aDir } } } }), a, 'P0-2: cached per root')
  rmSync(aDir, { recursive: true, force: true }); rmSync(bDir, { recursive: true, force: true })
}

// ── r. P0-3: canonical Layer 2 denies absolute/traversal/symlink ─────────
await (async () => {
  const ws = mkdtempSync(join(tmpdir(), 'cq-canonical-')).replaceAll('\\', '/')
  // Mock ctx.fs.resolve to return a lexically-canonical targetKey (path.resolve
  // collapses `..`; real realpath also resolves symlinks — sufficient here).
  const fs = { resolve: (p, { cwd }) => ({ targetKey: pathResolve(cwd, p).replaceAll('\\', '/') }) }
  const ons = {}
  const ctx = { get: (n) => n === 'tools' ? { guard: () => () => {} } : n === 'fs' ? fs : undefined, effect() {}, on(ev, fn) { (ons[ev] ||= []).push(fn) } }
  apply(ctx, { mode: 'runtime', policyDir: '.cq/policy' })
  const canonical = ons['tools/pre-execute'][0]
  const exec = (name, path) => ({ name, arguments: { file_path: path }, agent: { session: { header: { cwd: ws } } } })
  const next = () => ({ kind: 'allow' })
  assert.equal((await canonical(exec('write', 'src/../preset/x'), next))?.kind, 'deny', 'P0-3: traversal to preset denied (canonical)')
  assert.equal((await canonical(exec('write', ws + '/preset/x'), next))?.kind, 'deny', 'P0-3: absolute preset denied (canonical)')
  assert.equal((await canonical(exec('write', '.cq/policy/x'), next))?.kind, 'deny', 'P0-3: .cq/policy denied (canonical)')
  assert.equal((await canonical(exec('write', 'src/app.js'), next))?.kind, 'allow', 'P0-3: normal path allowed')
  rmSync(ws, { recursive: true, force: true })
})()

console.log(JSON.stringify({ ok: true, shellLiteral: true, overBlockRecorded: true, a2ResidualRecorded: true, cannotMap: true, modeMerge: true, roleRegistry: true, failClosed: true, guardMutatingOnly: true, guardThrow: true, baselineMerge: true, gateMerge: true, policyLoad: true, registryWiring: true, workspaceIsolation: true, canonicalLayer2: true, checks: 16 }))
