import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validatePolicy } from './cq-policy.mjs'

const VALID_POLICY = `schemaVersion: 1\ndefaultDeny: true\nfailClosed: true\n`
const VALID_ROLES = `schemaVersion: 1\nroles:\n  developer:\n    canWrite: true\n    canExecuteCommand: true\n    cannot: [modify-governance-rules]\n  architect:\n    canWrite: true\n    canExecuteCommand: true\n  product:\n    canWrite: true\n    canExecuteCommand: false\n  research:\n    canWrite: true\n    canExecuteCommand: false\n  ux:\n    canWrite: true\n    canExecuteCommand: false\n  ui:\n    canWrite: true\n    canExecuteCommand: false\n  tester:\n    canWrite: false\n    canExecuteCommand: true\n  devops:\n    canWrite: true\n    canExecuteCommand: true\n  review:\n    canWrite: false\n    canExecuteCommand: false\n`
const VALID_PATHS = `schemaVersion: 1\nprotected:\n  - "preset/**"\n  - ".cq/policy/**"\n  - "**.env"\n`
const VALID_GATES = `schemaVersion: 1\ngates:\n  design-approval:\n    tool: ask_user_question\n  frontend-approval:\n    tool: ask_user_question\n  production-release:\n    tool: ask_user_question\n`

async function writePolicy(dir) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'policy.yml'), VALID_POLICY)
  await writeFile(join(dir, 'roles.yml'), VALID_ROLES)
  await writeFile(join(dir, 'protected-paths.yml'), VALID_PATHS)
  await writeFile(join(dir, 'gates.yml'), VALID_GATES)
}

const okDir = await mkdtemp(join(tmpdir(), 'cq-pol-ok-'))
await writePolicy(okDir)
const ok = validatePolicy(okDir)
if (!ok.valid) throw new Error(`valid policy rejected: ${ok.errors.join('; ')}`)

// Fail-closed: remove gates.yml -> invalid.
const badDir = await mkdtemp(join(tmpdir(), 'cq-pol-bad-'))
await writePolicy(badDir)
const r = await import('node:fs/promises')
await r.rm(join(badDir, 'gates.yml'))
const bad = validatePolicy(badDir)
if (bad.valid || !bad.errors.some((e) => e.includes('gates.yml'))) throw new Error('missing gates.yml was not rejected')

// Fail-closed: defaultDeny false.
const laxDir = await mkdtemp(join(tmpdir(), 'cq-pol-lax-'))
await writePolicy(laxDir)
await r.writeFile(join(laxDir, 'policy.yml'), `schemaVersion: 1\ndefaultDeny: false\nfailClosed: true\n`)
const lax = validatePolicy(laxDir)
if (lax.valid || !lax.errors.some((e) => e.includes('defaultDeny'))) throw new Error('defaultDeny false was not rejected')

console.log(JSON.stringify({ ok: true, checks: 3 }))

// cleanup
for (const d of [okDir, badDir, laxDir]) { await r.rm(d, { recursive: true, force: true }) }
