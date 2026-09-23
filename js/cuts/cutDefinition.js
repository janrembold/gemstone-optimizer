import { indexedOpticalPlanes, finishIndexed, indexingVersion } from '../geometry/integerIndex.js';
import { leoJR } from './leoJR.js';
import { leonardo } from './leonardo.js';
import { blM5 } from './blM5.js';
import { roundBrilliant } from './roundBrilliant.js';
// A cut plugin supplies semantic parameters, topology metadata and a closed convex plane solid.
const definitions = new Map([
  [roundBrilliant.id, roundBrilliant],
  [blM5.id, blM5],
  [leonardo.id, leonardo],
  [leoJR.id, leoJR],
]);
export const cuts = new Map(
  [...definitions].map(([id, source]) => [
    id,
    {
      ...source,
      version: source.version + '-' + indexingVersion,
      generate(parameters = source.defaults, gear = source.defaultGear || 96) {
        if (source.nativeIntegerGeometry) return source.generate(parameters, gear);
        const raw = source.generate(parameters);
        return finishIndexed(raw, indexedOpticalPlanes(raw, gear), gear);
      },
    },
  ]),
);
export function getCut(id) {
  const cut = cuts.get(id);
  if (!cut) throw new Error(`Unknown cut: ${id}`);
  return cut;
}
