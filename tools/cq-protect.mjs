#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Reads .cq/policy/protected-paths.yml and provides a glob matcher that decides
// whether a workspace-relative path is protected. This is the runtime side of
// V2.0 governance: a guard (tools.guard / tools/pre-execute) calls
// matchProtected(path) and denies matching writes. The matcher implements a
// small, predictable glob subset so behavior is fail-closed and testable.

// Supported patterns:
//   preset/**       -> path starts with "preset/"
//   **.env          -> path ends with ".env"
//   **/secrets/**   -> any ancestor directory named "secrets"
//   .cq/policy/**   -> starts with ".cq/policy/"
//   exact/path.yml  -> exact match
function patternMatches(pattern, normalizedPath) {
  if (pattern.startsWith('**/')) {
    const tail = pattern.slice(3) // e.g. "credentials/**" or "secrets/**" or "foo"
    if (tail.endsWith('/**')) {
      const dir = tail.slice(0, -3) // "credentials"
      return normalizedPath.split('/').includes(dir)
    }
    return normalizedPath.endsWith(tail)
  }
  if (pattern.endsWith('/**')) {
    return normalizedPath.startsWith(pattern.slice(0, -3)) || normalizedPath === pattern.slice(0, -3)
  }
  if (pattern.startsWith('**.')) {
    return normalizedPath.endsWith(pattern.slice(2))
  }
  return normalizedPath === pattern
}

export function loadProtectedPaths(policyDir = '.cq/policy') {
  const file = resolve(policyDir, 'protected-paths.yml')
  let text
  try { text = readFileSync(file, 'utf8') }
  catch { return { error: `cannot read ${file}`, patterns: [] } }
  const patterns = []
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*-\s+"([^"]+)"\s*$/)
    if (m) patterns.push(m[1])
  }
  return { patterns, file }
}

export function matchProtected(path, policyDir = '.cq/policy') {
  const { patterns, error } = loadProtectedPaths(policyDir)
  if (error) return { protected: false, error, matchedPattern: null, patterns: [] }
  const normalized = String(path || '').replaceAll('\\', '/')
  for (const pattern of patterns) {
    if (patternMatches(pattern, normalized)) {
      return { protected: true, matchedPattern: pattern, patterns, error: null }
    }
  }
  return { protected: false, matchedPattern: null, patterns, error: null }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dir = resolve(process.argv[2] || '.cq/policy')
  const result = loadProtectedPaths(dir)
  console.log(JSON.stringify({ ...result, sample: {
    preset: matchProtected('preset/agent.cordis.yml', dir),
    env: matchProtected('.env', dir),
    policy: matchProtected('.cq/policy/policy.yml', dir),
    src: matchProtected('src/app.js', dir),
  } }, null, 2))
  if (result.error) process.exitCode = 1
}
