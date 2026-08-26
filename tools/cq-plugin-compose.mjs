#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { validatePluginManifest } from './cq-plugin-validate.mjs'

// Row fragments listed by a CQ Plugin manifest. For the composition-time (candidate B)
// approach a plugin ships one or more YAML fragments that are inlined into the target
// preset under an id-safe, rejected-if-conflicting rule. This validator is offline-only:
// it never deploys, never touches the DSH user preset directory, and always fails closed.
export async function composePluginRows({ manifest, baseText, basePresetVersion, dshVersion, rowFragments = [] }) {
  const errors = []
  const runtime = { cqOS: basePresetVersion || '0.2.0', dsh: dshVersion || '0.1.1-rc.2' }
  const manifestCheck = validatePluginManifest(manifest, runtime)
  if (!manifestCheck.valid) errors.push(...manifestCheck.errors)

  if (!Array.isArray(manifest.contributes.rows) || manifest.contributes.rows.length === 0) {
    errors.push('manifest contributes.rows must list at least one fragment')
  }

  // Split into YAML document nodes by their `- id:` top-level array items so we can
  // check id collisions without a full YAML engine. This is intentionally conservative.
  const baseIds = new Set([...baseText.matchAll(/^\s*-\s+id:\s+([^\s]+)/gm)].map((m) => m[1]))
  const incoming = []
  for (const source of rowFragments) {
    for (const m of source.matchAll(/^\s*-\s+id:\s+([^\s]+)/gm)) {
      const id = m[1]
      if (id === 'persona') continue
      if (baseIds.has(id)) errors.push(`row id "${id}" conflicts with a row already in the base preset`)
      if (incoming.some((item) => item.id === id)) errors.push(`row id "${id}" declared more than once in the plugin`)
      incoming.push({ id })
    }
  }

  if (errors.length > 0) return { valid: false, errors }

  // Merge: keep the base text, then append the plugin fragment documents.
  const merged = `${baseText.trimEnd()}\n\n# ── contributed by ${manifest.id} v${manifest.version} ─────────────\n${rowFragments.join('\n')}\n`
  return { valid: true, errors: [], baseIds: [...baseIds], pluginRowIds: incoming.map((item) => item.id), composed: merged }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [manifestPath, basePath, fragmentDir, versionRef = '0.2.0'] = process.argv.slice(2)
  if (!manifestPath || !basePath) throw new Error('usage: node tools/cq-plugin-compose.mjs <manifest.json> <base-agent.cordis.yml> [fragmentDir] [cqOSVersion]')
  const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'))
  const baseText = await readFile(resolve(basePath), 'utf8')
  const fragments = []
  for (const row of manifest.contributes.rows || []) {
    const fragment = await readFile(resolve(fragmentDir || '.', row), 'utf8').catch(() => '')
    if (fragment) fragments.push(fragment)
  }
  const result = await composePluginRows({ manifest, baseText, basePresetVersion: versionRef, rowFragments: fragments })
  console.log(JSON.stringify(result, null, 2))
  if (!result.valid) process.exitCode = 1
}
