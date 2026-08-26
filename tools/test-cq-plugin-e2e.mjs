import { validatePluginManifest } from './cq-plugin-validate.mjs'
import { composePluginRows } from './cq-plugin-compose.mjs'

// End-to-end against the exported API with an explicit CQ Plugin manifest
// object (mirroring preset/templates/plugin/cq-plugin.yml). This tests the
// validator + composer, not a YAML parser.
const compat = { cqOS: '0.2.0', dsh: '0.1.1-rc.2' }
const manifest = {
  schemaVersion: 1,
  id: 'cq-plugin-example',
  version: '0.1.0',
  plane: 'preset',
  compat: { cqOS: '>=0.2.0 <0.4.0', dsh: '>=0.1.1-rc.2 <1.0.0' },
  contributes: { rows: ['rows/example.cordis.yml'] },
  capabilities: { tools: {}, files: {}, network: false, model: {}, data: {} },
  lifecycle: { install: 'none', upgrade: 'none', uninstall: 'none', rollback: 'none' },
}

// 1. manifest must validate (fail: invalid id/version/host-plane).
const vm = validatePluginManifest(manifest, compat)
if (!vm.valid) throw new Error(`example manifest rejected: ${vm.errors.join('; ')}`)

// 2. compose a row into a base preset, must merge the row id.
const base = `- id: persona\n  name: '@deepseek-ai/dsh-persona'\n- id: tool-pwsh\n  name: '@deepseek-ai/dsh-tool-pwsh'\n`
const fragment = `- id: tool-example\n  name: '@cq/plugin-example'`
const composed = await composePluginRows({
  manifest,
  baseText: base,
  basePresetVersion: '0.2.0',
  dshVersion: '0.1.1-rc.2',
  rowFragments: [fragment],
})
if (!composed.valid || !composed.composed.includes('tool-example')) throw new Error(`compose failed: ${JSON.stringify(composed.errors)}`)

// 3. validation must fail closed on a host-plane manifest.
const host = validatePluginManifest({ ...manifest, id: 'CQ-Plugin', plane: 'host' }, compat)
if (host.valid || !host.errors.some((e) => e.includes('host'))) throw new Error('host-plane manifest accepted')

console.log(JSON.stringify({ ok: true, validate: vm.valid, compose: composed.valid, hostReject: !host.valid, checks: 3 }))
