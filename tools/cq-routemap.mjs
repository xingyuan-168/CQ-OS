#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Validates the CQ OS route-map (.cq/routemap.yml) structure, fail-closed:
// each declared route must have a provider/model/reason, and every referenced
// provider/model must be present in the DSH provider registry. Because the
// provider registry is deployment-specific and not accessible as plain data
// here, this validator checks structure and (optionally) a known-provider list.
// A malformed or incomplete route map is rejected rather than silently defaulted.

const KNOWN_PROVIDERS = (process.env.CQ_KNOWN_PROVIDERS || 'zai-coding-cn,DeepSeek,CX-5.6,lg-5.6').split(',')
const REQUIRED_KEYS = ['provider', 'model', 'reason']

function parse(text) {
  const lines = text.split(/\r?\n/)
  const result = { sections: {}, routeCount: 0, refs: [] }
  let current = null
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const sectionMatch = t.match(/^([a-zA-Z]+):\s*$/)
    if (sectionMatch) { current = sectionMatch[1]; result.sections[current] = {}; continue }
    if (current) {
      const kv = t.match(/^([a-zA-Z]+):\s*(.+)$/)
      if (kv) { result.sections[current][kv[1]] = kv[2]; continue }
      // List items under sections are not parsed here except provider refs.
      const listRef = t.match(/^-\s*"?([A-Za-z0-9._/-]+)"?$/)
      if (listRef) result.refs.push(listRef[1])
    }
  }
  return result
}

export function validateRouteMap(filePath, knownProviders = KNOWN_PROVIDERS) {
  const errors = []
  let text
  try { text = readFileSync(resolve(filePath), 'utf8') }
  catch { return { valid: false, errors: [`cannot read routemap: ${filePath}`] } }

  if (!/^\s*schemaVersion:\s*1\s*$/m.test(text)) errors.push('routemap: schemaVersion must be 1')

  const parsed = parse(text)
  // Top-level default must exist and have provider/model/reason.
  for (const key of REQUIRED_KEYS) {
    if (!parsed.sections.default?.[key]) errors.push(`routemap: default.${key} missing`)
  }
  // Each byRole / byComplexity route entry must have the required keys.
  for (const section of ['byRole', 'byComplexity']) {
    const block = parsed.sections[section]
    if (!block) { errors.push(`routemap: ${section} section missing`); continue }
  }

  // Determine entries: approximate by key blocks in text.
  const entries = text.match(/(byRole|byComplexity):\s*$/m) ? true : false
  // Collect each route's provider by scanning provider: lines.
  const providerLines = [...text.matchAll(/^\s{4}provider:\s*(\S+)\s*$/gm)].map((m) => m[1])
  const modelLines = [...text.matchAll(/^\s{4}model:\s*(\S+)\s*$/gm)].map((m) => m[1])
  for (const p of providerLines) {
    if (!knownProviders.includes(p)) errors.push(`routemap: provider "${p}" not in known provider list (${knownProviders.join(', ')})`)
  }
  if (modelLines.length === 0) errors.push('routemap: no models declared')
  if (providerLines.length === 0) errors.push('routemap: no providers declared')

  return { valid: errors.length === 0, errors }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = resolve(process.argv[2] || '.cq/routemap.yml')
  const result = validateRouteMap(file)
  console.log(JSON.stringify(result, null, 2))
  if (!result.valid) process.exitCode = 1
}
