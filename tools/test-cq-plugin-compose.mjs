import { composePluginRows } from './cq-plugin-compose.mjs'

const base = `
- id: persona
  name: '@deepseek-ai/dsh-persona'
- id: tool-pwsh
  name: '@deepseek-ai/dsh-tool-pwsh'
- id: tool-read
  name: '@deepseek-ai/dsh-tool-read'
`
const basePresetVersion = '0.2.0'
const goodManifest = {
  schemaVersion: 1,
  id: 'cq-plugin-reporter',
  version: '1.0.0',
  plane: 'preset',
  compat: { cqOS: '>=0.2.0 <0.4.0', dsh: '>=0.1.1-rc.2 <1.0.0' },
  contributes: { rows: ['reporter.yml'] },
  capabilities: { tools: {}, files: {}, network: false, model: {}, data: {} },
  lifecycle: { install: 'none', upgrade: 'none', uninstall: 'none', rollback: 'none' },
}
const goodFragment = `- id: tool-reporter\n  name: '@cq/plugin-reporter'\n  config: {}\n`
const ok = await composePluginRows({ manifest: goodManifest, baseText: base, basePresetVersion, dshVersion: '0.1.1-rc.2', rowFragments: [goodFragment] })
if (!ok.valid || !ok.composed.includes('tool-reporter') || !ok.composed.includes('tool-read')) throw new Error(`valid composition failed: ${JSON.stringify(ok.errors)}`)

const conflictFragment = `- id: tool-read\n  name: '@cq/plugin-reporter'\n`
const conflict = await composePluginRows({ manifest: goodManifest, baseText: base, basePresetVersion, dshVersion: '0.1.1-rc.2', rowFragments: [conflictFragment] })
if (conflict.valid || !conflict.errors.some((e) => e.includes('conflicts'))) throw new Error('row id conflict was not detected')

const hostManifest = { ...goodManifest, id: 'cq-plugin-bad', plane: 'host' }
const bad = await composePluginRows({ manifest: hostManifest, baseText: base, basePresetVersion, dshVersion: '0.1.1-rc.2', rowFragments: [goodFragment] })
if (bad.valid || !bad.errors.some((e) => e.includes('host'))) throw new Error('host-plane manifest was accepted')

console.log(JSON.stringify({ ok: true, checks: 3 }))
