import { apply } from '../preset/plugins/cq-governance/lib/index.js'

// Build a fake ctx that captures the registered guard, and a fake tools stub.
function makeCtx() {
  let registeredGuard = null
  const ctx = {
    get(name) {
      if (name === 'tools') return { guard: (fn) => { registeredGuard = fn; return () => {} } }
      return undefined
    },
    effect() {},
    on() {},
  }
  return { ctx, getGuard: () => registeredGuard }
}

// Runtime mode: preset/**, .cq/policy/**, .env, credentials, .dsh/** all denied.
{
  const { ctx, getGuard } = makeCtx()
  apply(ctx, { mode: 'runtime', policyDir: '.cq/policy' })
  const guard = getGuard()
  const deny = (path) => guard({ name: 'write', arguments: { path } })
  if (!deny('preset/agent.cordis.yml')) throw new Error('runtime: preset not denied')
  if (!deny('.env')) throw new Error('runtime: env not denied')
  if (!deny('config/credentials/x.key')) throw new Error('runtime: credentials not denied')
  if (!deny('.cq/policy/policy.yml')) throw new Error('runtime: policy not denied')
  if (deny('src/app.js')) throw new Error('runtime: src should be allowed')
  if (deny('docs/readme.md')) throw new Error('runtime: docs should be allowed')
}

// Maintenance mode: preset/** allowed, but .env/credentials/.dsh still denied (elevated, not anarchy).
{
  const { ctx, getGuard } = makeCtx()
  apply(ctx, { mode: 'maintenance', policyDir: '.cq/policy' })
  const guard = getGuard()
  const deny = (path) => guard({ name: 'write', arguments: { path } })
  if (deny('preset/agent.cordis.yml')) throw new Error('maintenance: preset should be writable')
  if (!deny('.env')) throw new Error('maintenance: env must still be denied')
  if (!deny('config/credentials/x.key')) throw new Error('maintenance: credentials must still be denied')
  if (!deny('.dsh/settings.yaml')) throw new Error('maintenance: .dsh must still be denied')
}

console.log(JSON.stringify({ ok: true, runtime: 'strict', maintenance: 'elevated-not-anarchy', checks: 2 }))
