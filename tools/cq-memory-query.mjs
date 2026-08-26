#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Query the derived memory index (.cq/index.json) and optionally read the
// matched source files. This satisfies the CQ Memory requirement of being
// queryable by type/status/agent/commit/version while Markdown stays the
// authoritative source. The index is derived and rebuildable.
export async function queryMemory(rootDirectory = '.', filter = {}) {
  const root = resolve(rootDirectory)
  const indexPath = resolve(root, '.cq', 'index.json')
  const index = JSON.parse(await readFile(indexPath, 'utf8'))
  const records = index.records

  const matches = records.filter((record) => {
    if (filter.type && record.type !== filter.type) return false
    if (filter.status && record.status !== filter.status) return false
    if (filter.agent && record.agent !== filter.agent) return false
    if (filter.commit && record.commit !== filter.commit) return false
    if (filter.version && record.version !== filter.version) return false
    if (filter.title && !String(record.title || '').includes(filter.title)) return false
    if (filter.id && record.id !== filter.id) return false
    return true
  })

  // Group by type to build a compact engineering-context summary.
  const byType = {}
  for (const record of matches) {
    if (!byType[record.type]) byType[record.type] = []
    byType[record.type].push(record.id)
  }

  return {
    total: index.records.length,
    matched: matches.length,
    filter,
    summary: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
    records: matches.map((record) => ({
      id: record.id, type: record.type, status: record.status,
      agent: record.agent, commit: record.commit, version: record.version,
      title: record.title, updatedAt: record.updatedAt, path: record.path,
    })),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [root = '.', filterArg] = process.argv.slice(2)
  let filter = {}
  if (filterArg) {
    // Accept either a JSON string or a path to a JSON file (shell-safe).
    const asFile = resolve(root, filterArg)
    let text = filterArg
    try {
      const { readFile: rf } = await import('node:fs/promises')
      text = await rf(asFile, 'utf8')
    } catch { /* fall back to treating it as inline JSON */ }
    filter = JSON.parse(text)
  }
  const result = await queryMemory(root, filter)
  console.log(JSON.stringify(result, null, 2))
}
