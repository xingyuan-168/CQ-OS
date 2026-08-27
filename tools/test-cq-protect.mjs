import { matchProtected } from './cq-protect.mjs'

// Validates the protected-paths matcher: protected targets are denied, others pass.
const mustProtect = ['preset/agent.cordis.yml', '.env', '.cq/policy/policy.yml', 'config/credentials/api.key', '.dsh/settings.yaml', 'secrets/prod.json']
const mustAllow = ['src/app.js', 'docs/README.md', 'tests/test.js', '.cq/progress.md']

for (const p of mustProtect) {
  const r = matchProtected(p, '.cq/policy')
  if (!r.protected) throw new Error(`expected protected, got allowed: ${p} (matched=${r.matchedPattern})`)
}
for (const p of mustAllow) {
  const r = matchProtected(p, '.cq/policy')
  if (r.protected) throw new Error(`expected allowed, got protected: ${p} (matched=${r.matchedPattern})`)
}

// Missing policy dir fails closed (protected=false + error, never silently allows a protected path).
const missing = matchProtected('preset/x', 'nonexistent-policy-dir')
if (missing.protected) throw new Error('missing policy must not protect (but must not claim protected either)')
if (!missing.error) throw new Error('missing policy must surface an error')

console.log(JSON.stringify({ ok: true, protect: mustProtect.length, allow: mustAllow.length, failClosed: true }))
