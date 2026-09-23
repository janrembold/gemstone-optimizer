import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseASC, exportASC, manufacturingReport } from '../js/export/gemcadAsc.js';
import { buildPolyhedron, validateSolid } from '../js/geometry/meshBuilder.js';
import { indexedOpticalPlanes, finishIndexed } from '../js/geometry/integerIndex.js';
import { evaluate } from '../js/optics/metrics.js';
import { materialModel } from '../js/materials.js';
const source = readFileSync('tests/fixtures/leonardo-fractional.asc', 'utf8');
const parsed = parseASC(source);
const original = {
  ...buildPolyhedron(parsed.facets),
  symmetry: 5,
  symmetryMirror: false,
  cutName: 'Leonardo integer 80',
  topologyVersion: 'user-leonardo-integer-1',
  approximation: true,
  derived: {},
};
const stone = finishIndexed(original, indexedOpticalPlanes(original, 80), 80);
const material = materialModel('moissanite');
const settings = { seed: 1919, faceRays: 3200, tiltRays: 2200, spectralRays: 800, fullTilt: true };
const metrics = evaluate(stone, material, settings);
writeFileSync(
  'docs/Leonardo-Moissanite-integer80.asc',
  exportASC(stone, material, 80).replace(/\r\n/g, '\n'),
);
writeFileSync(
  'docs/integer-index-reference.json',
  JSON.stringify(
    {
      sourceSHA256: createHash('sha256').update(source).digest('hex'),
      note: 'Reconstructed integer-index geometry, newly simulated. Original 72.93 score is not transferred.',
      indexingVersion: stone.indexingVersion,
      gear: 80,
      material,
      settings,
      before: manufacturingReport(original, 80),
      after: manufacturingReport(stone, 80),
      geometry: { ...validateSolid(stone), ...stone.derived },
      metrics,
    },
    null,
    2,
  ) + '\n',
);
console.log({
  before: manufacturingReport(original, 80),
  after: manufacturingReport(stone, 80),
  Global: metrics.Global,
});
