import { validatePluginManifest } from './cq-plugin-validate.mjs'
import { validateRouteAudit } from './cq-route-audit.mjs'

const runtime = { cqOS: '0.2.0', dsh: '0.1.1-rc.2' }
const valid = {
  schemaVersion: 1,
  id: 'cq-plugin-reporter',
  version: '1.0.0',
  plane: 'preset',
  compat: { cqOS: '>=0.2.0 <0.4.0', dsh: '>=0.1.1-rc.2 <1.0.0' },
  contributes: { rows: ['rows/reporter.yml'] },
  capabilities: { tools: {}, files: {}, network: false, model: {}, data: {} },
  lifecycle: { install: 'none', upgrade: 'none', uninstall: 'none', rollback: 'none' },
}
const goodManifest = validatePluginManifest(valid, runtime)
if (!goodManifest.valid) throw new Error(`valid manifest rejected: ${goodManifest.errors.join('; ')}`)
const hostManifest = validatePluginManifest({ ...valid, id: 'CQ-Plugin', plane: 'host' }, runtime)
if (hostManifest.valid || hostManifest.errors.length < 2) throw new Error('host-plane or invalid id was accepted')
const incompatManifest = validatePluginManifest({ ...valid, compat: { ...valid.compat, cqOS: '>=9.0.0' } }, runtime)
if (incompatManifest.valid || !incompatManifest.errors.includes('cqOS compatibility range is not satisfied')) throw new Error('incompatible manifest was accepted')
const directRoute = validateRouteAudit({ requested: { provider: 'deepseek-official', model: 'deepseek-chat' }, served: { provider: 'deepseek-official', model: 'deepseek-chat' }, gateway: null, fallback: false })
if (!directRoute.valid || directRoute.routeChanged) throw new Error('direct route audit failed')
const fallbackRoute = validateRouteAudit({ requested: { provider: 'primary', model: 'a' }, served: { provider: 'fallback', model: 'b' }, gateway: 'litellm', fallback: true })
if (!fallbackRoute.valid || !fallbackRoute.routeChanged) throw new Error('fallback route audit failed')
console.log(JSON.stringify({ ok: true, manifestChecks: 3, routeChecks: 2 }))
