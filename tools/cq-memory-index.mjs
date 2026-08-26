#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, relative, resolve, extname } from 'node:path'

const root = resolve(process.argv[2] || '.')
const memoryRoot = join(root, '.cq')
const outputPath = join(memoryRoot, 'index.json')
const allowedTypes = new Set(['project', 'decision', 'progress', 'execution-summary', 'bug', 'preference', 'tech-debt', 'version'])

const categoryFor = (path) => {
  const rel = relative(memoryRoot, path).replaceAll('\\', '/')
  if (rel === 'project.md') return 'project'
  if (rel === 'progress.md') return 'progress'
  if (rel === 'bugs.md') return 'bug'
  if (rel === 'preferences.md') return 'preference'
  if (rel === 'tech-debt.md') return 'tech-debt'
  if (rel.startsWith('decisions/')) return 'decision'
  if (rel.startsWith('executions/')) return 'execution-summary'
  if (rel.startsWith('versions/')) return 'version'
  return undefined
}

const scalar = (value) => {
  const text = value.trim()
  if (!text) return ''
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1)
  if (text === 'null') return null
  if (text === 'true') return true
  if (text === 'false') return false
  return text
}

const parseFrontMatter = (text) => {
  if (!text.startsWith('---\n')) return {}
  const end = text.indexOf('\n---', 4)
  if (end < 0) return {}
  const result = {}
  for (const line of text.slice(4, end).split(/\r?\n/)) {
    const split = line.indexOf(':')
    if (split <= 0) continue
    result[line.slice(0, split).trim()] = scalar(line.slice(split + 1))
  }
  return result
}

const titleFor = (text, fallback) => text.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback
const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === 'index.json' || entry.name === 'schema' || entry.name === 'validation') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else if (extname(entry.name).toLowerCase() === '.md') files.push(path)
  }
  return files
}

const files = await walk(memoryRoot)
const records = []
const reports = []
const seen = new Map()
for (const path of files.sort()) {
  const text = await readFile(path, 'utf8')
  const rel = relative(root, path).replaceAll('\\', '/')
  const category = categoryFor(path)
  const metadata = parseFrontMatter(text)
  const id = metadata.id || rel.replace(/^\.cq\//, '').replace(/\.md$/i, '').replace(/[^a-zA-Z0-9/_-]+/g, '-').replaceAll('/', '-')
  const type = metadata.type || category || 'legacy'
  const status = metadata.status || 'legacy'
  const hash = createHash('sha256').update(text).digest('hex')
  const record = {
    id,
    type,
    status,
    agent: metadata.agent || null,
    commit: metadata.commit || null,
    version: metadata.version || null,
    title: metadata.title || titleFor(text, id),
    tags: metadata.tags || null,
    updatedAt: metadata.updatedAt || null,
    path: rel,
    hash,
  }
  records.push(record)
  if (!allowedTypes.has(type) && type !== 'legacy') reports.push({ kind: 'invalid-type', path: rel, type })
  if (!metadata.id || !metadata.type || !metadata.status) reports.push({ kind: 'legacy', path: rel })
  if (!record.commit && type !== 'project' && type !== 'preference') reports.push({ kind: 'missing-commit', path: rel })
  if (seen.has(id)) reports.push({ kind: 'duplicate-id', id, paths: [seen.get(id), rel] })
  else seen.set(id, rel)
}

const index = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: '.cq',
  authoritative: 'markdown',
  records,
  reports,
}
await mkdir(memoryRoot, { recursive: true })
await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ index: outputPath, records: records.length, reports: reports.length, reportKinds: [...new Set(reports.map((item) => item.kind))] }, null, 2))
