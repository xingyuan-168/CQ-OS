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
  await mkdir(join(root, '.cq', 'selfcheck'), { recursive: true })
  await writeFile(join(root, '.cq', 'selfcheck', 'X.md'), '# X\nnot a memory record')
  await mkdir(join(root, '.cq', 'review'), { recursive: true })
  await writeFile(join(root, '.cq', 'review', 'Y.md'), '# Y\nreview conclusion')
  const result = await buildMemoryIndex(root)
  const index = JSON.parse(await readFile(join(root, '.cq', 'index.json'), 'utf8'))
  if (result.records !== 3 || index.records.length !== 3) throw new Error('record count mismatch')
  if (index.records.some((r) => r.path.includes('selfcheck'))) throw new Error('selfcheck leaked into index')
  if (index.records.some((r) => r.path.includes('review'))) throw new Error('review leaked into index')
  for (const kind of ['legacy', 'missing-commit', 'duplicate-id']) {
    if (!index.reports.some((item) => item.kind === kind)) throw new Error(`${kind} report missing`)
  }
  console.log(JSON.stringify({ ok: true, records: result.records, reports: result.reports }))
} finally {
  await rm(root, { recursive: true, force: true })
}
