#!/usr/bin/env node
// Tests for CQ Memory query (tools/cq-memory-query.mjs): filtering by
// type / status / agent / version / title and summary grouping.
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { queryMemory } from './cq-memory-query.mjs'

const INDEX = {
  records: [
    { id: 'd1', type: 'decision', status: 'active', agent: 'architect', commit: 'abc', version: '0.3.0', title: 'Use OPA', updatedAt: '2026-01-01', path: '.cq/decisions/d1.md' },
    { id: 'b1', type: 'bug', status: 'open', agent: 'developer', commit: 'def', version: '0.3.0', title: 'Leak', updatedAt: '2026-01-02', path: '.cq/bugs/b1.md' },
    { id: 'b2', type: 'bug', status: 'fixed', agent: 'tester', commit: 'ghi', version: '0.2.0', title: 'Crash', updatedAt: '2026-01-03', path: '.cq/bugs/b2.md' },
  ],
}

const dir = await mkdtemp(join(tmpdir(), 'cq-mem-'))
await mkdir(join(dir, '.cq'), { recursive: true })
await writeFile(join(dir, '.cq', 'index.json'), JSON.stringify(INDEX))

const checks = []
function assert(cond, msg) { if (!cond) throw new Error(msg) }

const byType = await queryMemory(dir, { type: 'bug' })
assert(byType.matched === 2 && byType.summary.bug === 2, 'type=bug filter / summary')
checks.push('type')

const byStatus = await queryMemory(dir, { status: 'open' })
assert(byStatus.matched === 1 && byStatus.records[0].id === 'b1', 'status=open filter')
checks.push('status')

const byAgent = await queryMemory(dir, { agent: 'developer' })
assert(byAgent.matched === 1, 'agent filter')
checks.push('agent')

const byVersion = await queryMemory(dir, { version: '0.3.0' })
assert(byVersion.matched === 2, 'version filter')
checks.push('version')

const combo = await queryMemory(dir, { type: 'bug', status: 'fixed' })
assert(combo.matched === 1 && combo.records[0].id === 'b2', 'combined filter')
checks.push('combined')

const byTitle = await queryMemory(dir, { title: 'Leak' })
assert(byTitle.matched === 1, 'title contains filter')
checks.push('title')

const none = await queryMemory(dir, { type: 'decision', status: 'open' })
assert(none.matched === 0, 'empty-result filter')
checks.push('empty')

console.log(JSON.stringify({ ok: true, checks: checks.length }))
await rm(dir, { recursive: true, force: true })
