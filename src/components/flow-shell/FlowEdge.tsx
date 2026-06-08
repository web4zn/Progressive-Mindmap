/**
 * FlowEdge — compatibility shim (mindmap-shell-v2, task 3).
 *
 * v1 was a single 20-line file. v2 splits it into three strategy
 * components (`SmoothstepEdge` / `BezierEdge` / `StraightEdge`)
 * registered with the edge registry. The renderer (`FlowShell`,
 * task 4) reads from `@/components/flow-shell/edges` to pick the
 * right strategy per edge.
 *
 * This shim keeps the `FlowEdge` named export as an alias for
 * `SmoothstepEdge` so existing call sites keep compiling.
 *
 * @deprecated import from `@/components/flow-shell/edges` instead.
 */
import SmoothstepEdge from './edges/SmoothstepEdge'

/**
 * @deprecated use `SmoothstepEdge` from `@/components/flow-shell/edges`.
 */
const FlowEdge = SmoothstepEdge

export default FlowEdge
