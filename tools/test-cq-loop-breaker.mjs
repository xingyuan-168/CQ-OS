import assert from 'node:assert'

// CQ OS LOOP_BREAKER detector (V2 §十三 / Final Hardening): pure rule logic,
// zero dependencies, no runtime framework. Rules:
//   Rule1: same tool + same args           -> max 1 (2nd identical -> block)
//   Rule2: same target + equivalent op     -> max 2 (3rd -> block)
//   Rule3: N consecutive no-new-info calls -> block
// Trigger contract: block=true means STOP -> BLOCKED -> summarize -> switch.

export class LoopBreaker {
  constructor({ sameArgsMax = 1, equivalentTargetMax = 2, noNewInfoMax = 3 } = {}) {
    this.sameArgsMax = sameArgsMax
    this.equivalentTargetMax = equivalentTargetMax
    this.noNewInfoMax = noNewInfoMax
    this._sameArgs = new Map()
    this._equivTarget = new Map()
    this._consecutiveNoNew = 0
  }

  _keyArgs(call) { return call.tool + '|' + JSON.stringify(call.args ?? {}) }
  _keyTarget(call) { return String(call.target ?? '') + '|' + String(call.op ?? call.tool ?? '') }

  check(call) {
    const ka = this._keyArgs(call)
    const ca = (this._sameArgs.get(ka) ?? 0) + 1
    this._sameArgs.set(ka, ca)
    if (ca > this.sameArgsMax) return { block: true, reason: 'LOOP_BREAKER: same tool+args repeated' }

    const kt = this._keyTarget(call)
    const ct = (this._equivTarget.get(kt) ?? 0) + 1
    this._equivTarget.set(kt, ct)
    if (ct > this.equivalentTargetMax) return { block: true, reason: 'LOOP_BREAKER: equivalent target repeated' }

    if (call.yieldsNew === false) this._consecutiveNoNew += 1
    else this._consecutiveNoNew = 0
    if (this._consecutiveNoNew > this.noNewInfoMax) return { block: true, reason: 'LOOP_BREAKER_TRIGGERED: no new info' }

    return { block: false }
  }
}

// Rule1: same tool + same args -> 1st ok, 2nd identical blocks.
{
  const lb = new LoopBreaker()
  assert.equal(lb.check({ tool: 'read', args: { file_path: 'a.js', offset: 1605, limit: 40 } }).block, false, 'r1: 1st same-args ok')
  assert.equal(lb.check({ tool: 'read', args: { file_path: 'a.js', offset: 1605, limit: 40 } }).block, true, 'r1: 2nd identical -> block')
}

// Rule2: same target + equivalent op -> 2 ok, 3rd blocks.
{
  const lb = new LoopBreaker()
  assert.equal(lb.check({ tool: 'grep', args: { pattern: 'deploy' }, target: 'deploy', op: 'grep' }).block, false, 'r2: 1st equiv ok')
  assert.equal(lb.check({ tool: 'pwsh', args: { command: 'Select-String deploy' }, target: 'deploy', op: 'grep' }).block, false, 'r2: 2nd equiv ok (method changed)')
  assert.equal(lb.check({ tool: 'web_search', args: { queries: ['deploy'] }, target: 'deploy', op: 'grep' }).block, true, 'r2: 3rd equiv -> block')
}

// Rule3: consecutive no-new-info -> block after threshold; new info resets.
{
  const lb = new LoopBreaker()
  for (let i = 0; i < 3; i++) assert.equal(lb.check({ tool: 'read', args: { f: 'v' + i }, target: 't' + i, yieldsNew: false }).block, false, 'r3: build-up ' + i)
  assert.equal(lb.check({ tool: 'read', args: { f: 'v4' }, target: 't4', yieldsNew: false }).block, true, 'r3: threshold -> block')
}

{
  const lb = new LoopBreaker()
  lb.check({ tool: 'read', args: { f: 'a' }, target: 'ta', yieldsNew: false })
  lb.check({ tool: 'read', args: { f: 'b' }, target: 'tb', yieldsNew: true })
  assert.equal(lb.check({ tool: 'read', args: { f: 'c' }, target: 'tc', yieldsNew: false }).block, false, 'r3: new info resets consecutive counter')
}

console.log(JSON.stringify({ ok: true, sameArgs: true, equivalentTarget: true, noNewInfo: true, resetOnNewInfo: true, checks: 4 }))
