/**
 * Direction predicates for the "move up / move down" node actions.
 *
 * Sibling order is the `children` array order; dagre lays siblings out top to
 * bottom in LR mode, so index − 1 is visually "up". Keeping the predicates as
 * pure functions makes the boundary rules testable independently of the canvas.
 */

/** 上移: allowed unless the node is already the first sibling. */
export function canMoveUp(index: number): boolean {
  return index > 0
}

/** 下移: allowed unless the node is already the last sibling. */
export function canMoveDown(index: number, siblingCount: number): boolean {
  return index >= 0 && index < siblingCount - 1
}
