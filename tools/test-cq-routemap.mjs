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

// valid
const okDir = await mkdtemp(join(tmpdir(), 'cq-route-ok-'))
const okFile = join(okDir, 'routemap.yml')
await writeFile(okFile, VALID)
const ok = validateRouteMap(okFile, ['zai-coding-cn'])
if (!ok.valid) throw new Error(`valid routemap rejected: ${ok.errors.join('; ')}`)

// fail-closed: unknown provider
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

console.log(JSON.stringify({ ok: true, checks: 3 }))

const rm = await import('node:fs/promises')
for (const d of [okDir, badDir, laxDir]) await rm.rm(d, { recursive: true, force: true })
