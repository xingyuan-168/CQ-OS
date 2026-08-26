export function validateRouteAudit(record) {
  const errors = []
  const requested = record?.requested
  const served = record?.served
  if (!requested?.provider || !requested?.model) errors.push('requested provider/model is required')
  if (!served?.provider || !served?.model) errors.push('served provider/model is required')
  if (record?.gateway !== null && record?.gateway !== undefined && typeof record.gateway !== 'string') errors.push('gateway must be a string or null')
  if (record?.fallback !== undefined && typeof record.fallback !== 'boolean') errors.push('fallback must be boolean')
  return { valid: errors.length === 0, errors, routeChanged: Boolean(requested?.provider && served?.provider && (requested.provider !== served.provider || requested.model !== served.model)) }
}

import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const source = process.argv[2]
  if (!source) throw new Error('usage: node tools/cq-route-audit.mjs <json-record | path-to-json>')
  const text = await readFile(resolve(source)).catch(() => source)
  const result = validateRouteAudit(JSON.parse(text))
  console.log(JSON.stringify(result, null, 2))
  if (!result.valid) process.exitCode = 1
}
