// @cq/governance — role identity registry. Zero external dependencies.
//
// ADR-0025 §4 / Core Review #3: `exec.agent` carries no machine-readable role
// name, so role identity is reconstructed from the delegation surface:
//   - the root agent (delegationDepth 0) is `core`;
//   - a spawned subagent is correlated to a role by pairing the spawn tool's
//     name (subagent_<role>) with the following `subagent/start` event via a
//     FIFO queue of childSessionId -> role.
//
// The correlation surface is intentionally defensive. The `subagent/start`
// event name and payload are not guaranteed stable across versions, and
// concurrent spawns can leave more than one pending entry in the FIFO. ANY
// ambiguity — a missing payload field, an unconsumed concurrent spawn, a shift
// mismatch, or a lookup miss — collapses to UNKNOWN. UNKNOWN is fail-closed:
// the enforcement layer treats it as deny-default (canWrite=false,
// canExecuteCommand=false, cannot=all) once role enforcement is enabled.

export const UNKNOWN = Symbol('UNKNOWN')

// Extract a role name from a spawn tool name of the form `subagent_<role>`.
export function roleFromToolName(toolName) {
  const m = /^subagent_([a-z0-9_-]+)$/i.exec(toolName ?? '')
  return m ? m[1] : UNKNOWN
}

// Create an independent role registry.
export function createRoleRegistry() {
  const queue = [] // pending spawn toolNames, FIFO
  const sessionToRole = new Map() // childSessionId -> role

  return {
    // Record a spawn. Called when a delegation tool with a role-derived name is
    // observed. Pushes the tool name onto the FIFO for later correlation.
    observeSpawn(toolName) {
      try {
        queue.push(toolName)
      } catch {
        /* fail-closed: ambiguity surfaces at correlateStart as UNKNOWN */
      }
    },

    // Correlate a `subagent/start` event payload to the next pending spawn.
    // Any ambiguity -> UNKNOWN. Returns the resolved role (or UNKNOWN).
    correlateStart(payload) {
      try {
        // `subagent/start` listener receives the identity object whose `info.id`
        // is the child session/agent id (confirmed: dsh-tool-cordis index.js:4230).
        const childSessionId = payload?.id ?? payload?.info?.id ?? payload?.childSessionId ?? payload?.sessionId
        // More than one pending unconsumed spawn => FIFO order is unreliable.
        if (queue.length > 1) {
          queue.length = 0 // drop the stale queue; everything is UNKNOWN now
          return UNKNOWN
        }
        const toolName = queue.shift()
        if (childSessionId == null || toolName == null) return UNKNOWN
        const role = roleFromToolName(toolName)
        if (role === UNKNOWN) return UNKNOWN
        sessionToRole.set(childSessionId, role)
        return role
      } catch {
        return UNKNOWN
      }
    },

    // Resolve the role of an execution. Root -> 'core'. Unknown/ambiguous -> UNKNOWN.
    roleOf(exec) {
      try {
        const agent = exec?.agent
        if (!agent) return UNKNOWN // no agent info -> guard-only (UNKNOWN)
        const depth = agent.delegationDepth
        const isRoot = depth === 0 || (depth == null && agent.root === true)
        if (isRoot) return 'core'
        const sessionId = agent?.session?.header?.id ?? agent?.sessionId ?? agent?.id
        if (sessionId == null) return UNKNOWN
        const role = sessionToRole.get(sessionId)
        return role === undefined ? UNKNOWN : role
      } catch {
        return UNKNOWN
      }
    },

    // For diagnostics only: peek how many spawns are awaiting correlation.
    pendingCount() {
      return queue.length
    },
  }
}
