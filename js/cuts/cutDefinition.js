import { roundBrilliant } from './roundBrilliant.js';
// A cut plugin supplies semantic parameters, topology metadata and a closed convex plane solid.
export const cuts = new Map([[roundBrilliant.id, roundBrilliant]]);
export function getCut(id) {
  const cut = cuts.get(id);
  if (!cut) throw new Error(`Unknown cut: ${id}`);
  return cut;
}
