/**
 * FlowNode — compatibility shim (mindmap-shell-v2, task 3).
 *
 * The v1 implementation was a single 230-line file. v2 splits it
 * into:
 *
 *   - `BaseNode`        — shared header / handles / footer wrapper
 *   - `RectCardNode`    — the default shape
 *   - `RoundedChipNode` — short-label pill
 *   - `IconCircleNode`  — circular badge
 *   - `StadiumNode`     — leaf pill
 *
 * The renderer (`FlowShell`, task 4) reads from
 * `@/components/flow-shell/nodes` to pick the right shape per
 * node. For now we keep the named export `FlowNode` as an alias
 * for `RectCardNode` so existing call sites keep compiling.
 *
 * Mark this file as deprecated — `@deprecated` is informational;
 * the alias prevents breakage during the staged rollout.
 *
 * @deprecated import from `@/components/flow-shell/nodes` instead.
 */
import RectCardNode from './nodes/RectCardNode'

/**
 * @deprecated use `RectCardNode` from `@/components/flow-shell/nodes`.
 */
const FlowNode = RectCardNode

export default FlowNode
