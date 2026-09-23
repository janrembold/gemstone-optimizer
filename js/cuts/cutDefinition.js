import { leonardo } from './leonardo.js';
import { blM5 } from './blM5.js';
import { roundBrilliant } from './roundBrilliant.js';
// A cut plugin supplies semantic parameters, topology metadata and a closed convex plane solid.
export const cuts = new Map([
  [roundBrilliant.id, roundBrilliant],
  [blM5.id, blM5],
  [leonardo.id, leonardo],
]);
export function getCut(id) {
  const cut = cuts.get(id);
  if (!cut) throw new Error(`Unknown cut: ${id}`);
  return cut;
}
