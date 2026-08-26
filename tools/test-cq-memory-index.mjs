import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildMemoryIndex } from './cq-memory-index.mjs'

const root = await mkdtemp(join(tmpdir(), 'cq-memory-test-'))
try {
  await mkdir(join(root, '.cq', 'decisions'), { recursive: true })
  await writeFile(join(root, '.cq', 'project.md'), '# Project\nlegacy project')
  await writeFile(join(root, '.cq', 'decisions', 'one.md'), '# One\nlegacy decision')
  await writeFile(join(root, '.cq', 'decisions', 'two.md'), '---\nid: decisions-one\ntype: decision\nstatus: accepted\nupdatedAt: 2026-01-01\n---\n# Two\nmissing commit')
  const result = await buildMemoryIndex(root)
  const index = JSON.parse(await readFile(join(root, '.cq', 'index.json'), 'utf8'))
  if (result.records !== 3 || index.records.length !== 3) throw new Error('record count mismatch')
  for (const kind of ['legacy', 'missing-commit', 'duplicate-id']) {
    if (!index.reports.some((item) => item.kind === kind)) throw new Error(`${kind} report missing`)
  }
  console.log(JSON.stringify({ ok: true, records: result.records, reports: result.reports }))
} finally {
  await rm(root, { recursive: true, force: true })
}
