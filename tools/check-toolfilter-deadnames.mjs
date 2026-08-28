#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Conservative P0-3 regression guard: the daily CQ OS preset never mounts
// tool-cordis, so `cordis_*` names are known to never register. A `toolFilter`
// .allow or .deny that still names any of them risks a role failing at startup.

function check(presetPath) {
  const text = readFileSync(resolve(presetPath), 'utf8')
  const hits = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || !/^deny:|^allow:| (deny|allow):/.test(trimmed)) continue
    const names = [...line.matchAll(/cordis_[a-z_]+/g)].map((m) => m[0])
    if (names.length > 0) hits.push({ line: i + 1, names: [...new Set(names)] })
  }
  return { path: presetPath, dead: hits }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const paths = process.argv.slice(2)
  if (paths.length === 0) throw new Error('usage: node tools/check-toolfilter-deadnames.mjs <agent.cordis.yml> [more...]')
  const results = paths.map(check)
  console.log(JSON.stringify(results, null, 2))
  if (results.some((r) => r.dead.length > 0)) process.exitCode = 1
}
