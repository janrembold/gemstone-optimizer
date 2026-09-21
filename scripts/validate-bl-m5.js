import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { generate, parameters, blM5 } from '../js/cuts/blM5.js';
import { parseASC, exportASC } from '../js/export/gemcadAsc.js';
import { buildPolyhedron, validateSolid } from '../js/geometry/meshBuilder.js';
import { materialModel } from '../js/materials.js';
import { evaluate } from '../js/optics/metrics.js';
import { optimize } from '../js/optimizer/optimizer.js';
const fixture = readFileSync('tests/fixtures/bl-m5.asc', 'utf8'),
  original = buildPolyhedron(parseASC(fixture).facets),
  stone = generate(),
  material = materialModel('moissanite');
const convergence = [800, 3200, 12800].map((n) => {
  const m = evaluate(stone, material, {
    faceRays: n,
    tiltRays: Math.round((n * 2200) / 3200),
    spectralRays: n / 4,
    fullTilt: true,
  });
  return {
    rays: n,
    Global: m.Global,
    Brilliance: m.Brilliance,
    Fire: m.Fire,
    Tilt: m.Tilt,
    HeadShadow: m.HeadShadow,
    Leak: m.Leak,
    headShadowSE: m.headShadow.standardError,
    residual: m.face.residual,
  };
});
const run = await optimize({
  cutId: blM5.id,
  material,
  gear: 96,
  seed: 1919,
  preset: 'fast',
  ranges: parameters.map(({ key, min, max, coarse, fine }) => ({ key, min, max, coarse, fine })),
  verification: { faceRays: 3200, tiltRays: 2200, spectralRays: 800 },
});
const report = {
  ...run,
  referenceValidation: {
    fixtureSHA256: createHash('sha256').update(fixture).digest('hex'),
    correction: 'Table angle 0.000994 degrees -> exactly 0 degrees; normal distance retained',
    originalVolume: validateSolid(original).volume,
    corrected: { ...validateSolid(stone), ...stone.derived },
    convergence,
  },
};
writeFileSync('docs/bl-m5-results.json', JSON.stringify(report, null, 2) + '\n');
writeFileSync('docs/BL-M5-reference.asc', exportASC(stone, material));
console.log(
  JSON.stringify(
    {
      reference: report.referenceValidation,
      best: run.results[0].parameters,
      statistics: run.statistics,
    },
    null,
    2,
  ),
);
