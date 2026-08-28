#!/usr/bin/env node
// Tests for CQ route audit (tools/cq-route-audit.mjs): validateRouteAudit()
// pure-function contract — required fields, route-change detection, gateway /
// fallback type checks.
import assert from 'node:assert'
import { validateRouteAudit } from './cq-route-audit.mjs'

// valid, no route change
{
  const r = validateRouteAudit({ requested: { provider: 'p', model: 'm1' }, served: { provider: 'p', model: 'm1' }, gateway: null, fallback: false })
  assert.ok(r.valid, 'valid record should be valid')
  assert.ok(r.routeChanged === false, 'same provider/model => no route change')
}

// valid, route changed
{
  const r = validateRouteAudit({ requested: { provider: 'p', model: 'm1' }, served: { provider: 'q', model: 'm2' }, gateway: 'g', fallback: true })
  assert.ok(r.valid, 'valid even when route changed')
  assert.ok(r.routeChanged === true, 'different provider => route change detected')
}

// invalid: missing served
{
  const r = validateRouteAudit({ requested: { provider: 'p', model: 'm1' } })
  assert.ok(!r.valid)
  assert.ok(r.errors.includes('served provider/model is required'))
}

// invalid: missing requested
{
  const r = validateRouteAudit({ served: { provider: 'p', model: 'm1' } })
  assert.ok(!r.valid)
  assert.ok(r.errors.includes('requested provider/model is required'))
}

// invalid: gateway wrong type
{
  const r = validateRouteAudit({ requested: { provider: 'p', model: 'm1' }, served: { provider: 'p', model: 'm1' }, gateway: 123 })
  assert.ok(!r.valid)
  assert.ok(r.errors.includes('gateway must be a string or null'))
}

// invalid: fallback wrong type
{
  const r = validateRouteAudit({ requested: { provider: 'p', model: 'm1' }, served: { provider: 'p', model: 'm1' }, fallback: 'yes' })
  assert.ok(!r.valid)
  assert.ok(r.errors.includes('fallback must be boolean'))
}

console.log(JSON.stringify({ ok: true, checks: 6 }))
