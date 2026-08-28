#!/usr/bin/env node
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateRouteMap } from './cq-routemap.mjs'

const VALID = `schemaVersion: 1
default:
  provider: zai-coding-cn
  model: GLM-5.3
  reason: default
byRole:
  architect:
    provider: zai-coding-cn
    model: GLM-5.3
    reason: strong
  developer:
    provider: zai-coding-cn
    model: GLM-5.3
    reason: normal
byComplexity:
  high:
    provider: zai-coding-cn
    model: GLM-5.3
    reason: high
  low:
    provider: zai-coding-cn
    model: GLM-5.3
    reason: low
`

// valid (4-space byRole entries, 2-space default)
const okDir = await mkdtemp(join(tmpdir(), 'cq-route-ok-'))
const okFile = join(okDir, 'routemap.yml')
await writeFile(okFile, VALID)
const ok = validateRouteMap(okFile, ['zai-coding-cn'])
if (!ok.valid) throw new Error(`valid routemap rejected: ${ok.errors.join('; ')}`)

// fail-closed: unknown provider in a byRole entry
const badDir = await mkdtemp(join(tmpdir(), 'cq-route-bad-'))
const badFile = join(badDir, 'routemap.yml')
await writeFile(badFile, VALID.replaceAll('zai-coding-cn', 'unknown-provider'))
const bad = validateRouteMap(badFile, ['zai-coding-cn'])
if (bad.valid || !bad.errors.some((e) => e.includes('unknown-provider'))) throw new Error('unknown provider was not rejected')

// fail-closed: missing schemaVersion
const laxDir = await mkdtemp(join(tmpdir(), 'cq-route-lax-'))
const laxFile = join(laxDir, 'routemap.yml')
await writeFile(laxFile, VALID.replace('schemaVersion: 1\n', ''))
const lax = validateRouteMap(laxFile, ['zai-coding-cn'])
if (lax.valid || !lax.errors.some((e) => e.includes('schemaVersion'))) throw new Error('missing schemaVersion was not rejected')

// fail-closed: unknown provider in the default entry (2-space, was silently skipped before)
const defDir = await mkdtemp(join(tmpdir(), 'cq-route-def-'))
const defFile = join(defDir, 'routemap.yml')
await writeFile(defFile, VALID.replace('provider: zai-coding-cn', 'provider: unknown-provider'))
const def = validateRouteMap(defFile, ['zai-coding-cn'])
if (def.valid || !def.errors.some((e) => e.includes('unknown-provider'))) throw new Error('unknown default provider was not rejected')

// indentation-independent: deeply nested (uniformly +4 spaces) must still validate
const deep = VALID.replace(/^  /gm, '      ')
const deepDir = await mkdtemp(join(tmpdir(), 'cq-route-deep-'))
const deepFile = join(deepDir, 'routemap.yml')
await writeFile(deepFile, deep)
const deepRes = validateRouteMap(deepFile, ['zai-coding-cn'])
if (!deepRes.valid) throw new Error(`deeply-indented routemap rejected: ${deepRes.errors.join('; ')}`)

console.log(JSON.stringify({ ok: true, checks: 5 }))

const rm = await import('node:fs/promises')
for (const d of [okDir, badDir, laxDir, defDir, deepDir]) await rm.rm(d, { recursive: true, force: true })
