#!/usr/bin/env node
// P4 validation helper: hash-compare source preset files against deployed artifacts.
// Source of truth  = preset/  (repo)
// Deployed plugin = C:\Users\84700\.dsh\profiles\web\node_modules\@cq\governance
// Deployed presets= C:\Users\84700\.dsh\.agent-presets\cq-os  and  \cq-os-maint
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'

const REPO = process.cwd()
const HOME = process.env.USERPROFILE
const P = (s) => s.replace(/[\\/]+/g, '/')

function hash(file) {
  try { return createHash('sha256').update(readFileSync(file)).digest('hex') } catch { return null }
}

function collect(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) collect(full, base, out)
    else out.push(full)
  }
  return out
}

const rows = []
function compare(label, srcDir, dstDir, mapDst = null) {
  for (const f of collect(srcDir)) {
    const rel = P(relative(srcDir, f))
    const dstFile = mapDst ? join(mapDst, rel) : join(dstDir, rel)
    const a = hash(f)
    const b = hash(dstFile)
    if (a !== b) rows.push({ label, rel, state: a === null ? 'SRC_UNREADABLE' : b === null ? 'DST_MISSING' : 'DRIFT' })
  }
}

// 1. cq-os preset (same-layout files only)
const srcCq = join(REPO, 'preset')
const dstCq = join(HOME, '.dsh', '.agent-presets', 'cq-os')
compare('cq-os', srcCq, dstCq)

// 2. cq-os-maint preset
const srcMaint = join(REPO, 'preset', 'maintenance')
const dstMaint = join(HOME, '.dsh', '.agent-presets', 'cq-os-maint')
compare('cq-os-maint', srcMaint, dstMaint)

// 3. governance plugin -> web profile
const srcPlugin = join(REPO, 'preset', 'plugins', 'cq-governance')
const dstPlugin = join(HOME, '.dsh', 'profiles', 'web', 'node_modules', '@cq', 'governance')
compare('plugin(web)', srcPlugin, dstPlugin)

// 4. governance plugin -> desktop profile
const dstPluginD = join(HOME, '.dsh', 'profiles', 'desktop', 'node_modules', '@cq', 'governance')
compare('plugin(desktop)', srcPlugin, dstPluginD)

// 5. governance plugin -> Temp cq-governance
const dstPluginT = join(process.env.LOCALAPPDATA, 'Temp', 'cq-governance')
compare('plugin(temp)', srcPlugin, dstPluginT)

console.log(JSON.stringify({ ok: rows.length === 0, mismatches: rows }, null, 2))
