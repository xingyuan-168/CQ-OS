const idPattern = /^[a-z0-9][a-z0-9-]*$/
const planes = new Set(['preset', 'client'])
const capabilityKeys = ['tools', 'files', 'network', 'model', 'data']
const lifecycleKeys = ['install', 'upgrade', 'uninstall', 'rollback']

const parseVersion = (value) => {
  const match = String(value).match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/)
  if (!match) return undefined
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] || '' }
}

const compareVersions = (left, right) => {
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1
  }
  if (left.prerelease === right.prerelease) return 0
  if (!left.prerelease) return 1
  if (!right.prerelease) return -1
  return left.prerelease < right.prerelease ? -1 : 1
}

export function satisfiesRange(versionText, rangeText) {
  const version = parseVersion(versionText)
  if (!version || typeof rangeText !== 'string') return false
  for (const part of rangeText.trim().split(/\s+/)) {
    if (!part) continue
    const match = part.match(/^(>=|<=|>|<|=)?(.+)$/)
    const target = parseVersion(match?.[2])
    if (!target) return false
    const result = compareVersions(version, target)
    const operator = match[1] || '='
    if ((operator === '>=' && result < 0) || (operator === '<=' && result > 0) || (operator === '>' && result <= 0) || (operator === '<' && result >= 0) || (operator === '=' && result !== 0)) return false
  }
  return true
}

export function validatePluginManifest(manifest, runtime) {
  const errors = []
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return { valid: false, errors: ['manifest must be an object'] }
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1')
  if (!idPattern.test(manifest.id || '')) errors.push('id must match lowercase CQ plugin id rules')
  if (!parseVersion(manifest.version)) errors.push('version must be SemVer x.y.z')
  if (!planes.has(manifest.plane)) errors.push('plane must be preset or client; host-plane plugins are forbidden')
  if (!manifest.compat || typeof manifest.compat !== 'object') errors.push('compat is required')
  else {
    if (!satisfiesRange(runtime.cqOS, manifest.compat.cqOS)) errors.push('cqOS compatibility range is not satisfied')
    if (!satisfiesRange(runtime.dsh, manifest.compat.dsh)) errors.push('DSH compatibility range is not satisfied')
  }
  if (!manifest.contributes || !Array.isArray(manifest.contributes.rows) || manifest.contributes.rows.length === 0) errors.push('at least one contributed row is required')
  if (!manifest.capabilities || typeof manifest.capabilities !== 'object') errors.push('capabilities is required')
  else for (const key of capabilityKeys) if (!(key in manifest.capabilities)) errors.push(`capabilities.${key} is required`)
  if (!manifest.lifecycle || typeof manifest.lifecycle !== 'object') errors.push('lifecycle is required')
  else for (const key of lifecycleKeys) if (!(key in manifest.lifecycle)) errors.push(`lifecycle.${key} is required`)
  return { valid: errors.length === 0, errors }
}

import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { load as yamlLoad } from 'js-yaml'

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source, cqOS = '0.2.0', dsh = '0.1.1-rc.2'] = process.argv.slice(2)
  if (!source) throw new Error('usage: node tools/cq-plugin-validate.mjs <manifest|path-to-manifest> [cqOS] [dsh]')
  const text = await readFile(resolve(source), 'utf8').catch(() => source)
  let manifest
  try {
    // YAML by extension (or when the text is not JSON); otherwise JSON.
    const isYaml = /\.ya?ml$/i.test(source) || !/^\s*[{\[]/.test(text)
    manifest = isYaml ? yamlLoad(text) : JSON.parse(text)
  } catch (err) {
    console.log(JSON.stringify({ valid: false, errors: [`manifest parse failed: ${err.message}`] }, null, 2))
    process.exitCode = 1
    process.exit(1)
  }
  const result = validatePluginManifest(manifest, { cqOS, dsh })
  console.log(JSON.stringify(result, null, 2))
  if (!result.valid) process.exitCode = 1
}
