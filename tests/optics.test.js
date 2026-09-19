import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, defaults } from '../js/cuts/roundBrilliant.js';
import { materialModel } from '../js/materials.js';
import { census } from '../js/optics/rayTracer.js';
import { evaluate, scores, scintillation, spectralCensus } from '../js/optics/metrics.js';
import { configurationID } from '../js/reproducibility.js';
const near = (a, b, e = 1e-10) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
test('Global weighted sum and minimum metric use the requested component formulas', () => {
  const m = { Brilliance: 80, Fire: 50, Tilt: 60, Scintillation: 70, Symmetry: 100, Leak: 10 };
  const r = scores(m);
  near(r.Global, 72.8);
  near(r.minimumMetric, 50);
  near(
    scores({ Brilliance: 100, Fire: 100, Tilt: 100, Scintillation: 100, Symmetry: 100, Leak: 0 })
      .Global,
    100,
  );
});
test('Scintillation follows active surface facet count, including real girdle facets', () => {
  near(scintillation(0), 0);
  near(scintillation(45), 100 * (1 - 1 / Math.E));
  near(scintillation(57), 71.82307109050416);
  near(
    evaluate(generate(), materialModel('diamond'), { faceRays: 32, tiltRays: 32, spectralRays: 32 })
      .Scintillation,
    scintillation(73),
  );
});
test('Seeded tracing and all metrics are bit-for-bit reproducible', () => {
  const s = generate(),
    m = materialModel('moissanite'),
    opt = { faceRays: 128, tiltRays: 96, spectralRays: 64 };
  assert.deepEqual(evaluate(s, m, opt), evaluate(s, m, opt));
});
test('Energy accounting closes at all seven tilts in diamond and moissanite', () => {
  for (const id of ['diamond', 'moissanite'])
    for (const tilt of [0, 5, 10, 15, 20, 25, 30]) {
      const r = census(generate(), materialModel(id), 256, tilt);
      near(r.useful + r.leak + r.crownOther + r.surface + r.residual, 100, 1e-9);
      near(r.entered + r.surface, 100, 1e-9);
    }
});
test('No dispersion gives zero angular separation and zero Fire', () => {
  const s = generate(),
    m = { ...materialModel('moissanite'), dispersion: 0 };
  const f = spectralCensus(s, m, { spectralRays: 256 });
  near(f.score, 0);
  near(f.meanSeparationDeg, 0);
});
test('Real dispersion causes returned spectral separation, all metric terms bounded', () => {
  const r = evaluate(generate(), materialModel('diamond'), {
    faceRays: 512,
    tiltRays: 256,
    spectralRays: 256,
    fullTilt: true,
  });
  assert.ok(r.fire.meanSeparationDeg > 0);
  assert.ok(r.Fire > 0);
  assert.equal(r.tiltCurve.length, 7);
  for (const k of [
    'Global',
    'Brilliance',
    'Fire',
    'Tilt',
    'Scintillation',
    'Symmetry',
    'Leak',
    'minimumMetric',
  ])
    assert.ok(r[k] >= 0 && r[k] <= 100, k);
  near(
    r.Tilt,
    Math.min(100, (100 * r.tiltCurve.find((t) => t.angle === 20).useful) / r.Brilliance),
  );
});
test('A shallow windowed pavilion leaks more than the published primary proportions', () => {
  const m = materialModel('diamond'),
    o = { seed: 1919 };
  const reference = census(generate(), m, 2048, 0, o),
    shallow = census(generate({ ...defaults, pavilion: 20 }), m, 2048, 0, o);
  assert.ok(
    shallow.leak > reference.leak + 30,
    JSON.stringify({ reference: reference.leak, shallow: shallow.leak }),
  );
  assert.ok(reference.useful > shallow.useful);
});
test('Longer tracing resolves residual energy without inventing energy', () => {
  const s = generate(),
    m = materialModel('moissanite');
  const a = census(s, m, 512, 0, { maxBounces: 24 }),
    b = census(s, m, 512, 0, { maxBounces: 96 });
  assert.ok(b.residual <= a.residual);
  assert.ok(b.useful >= a.useful - 1e-9);
  assert.ok(b.leak >= a.leak - 1e-9);
});
test('Configuration IDs ignore object key order but include every optical setting', () => {
  assert.equal(configurationID({ a: 1, b: 2 }), configurationID({ b: 2, a: 1 }));
  assert.notEqual(configurationID({ seed: 1 }), configurationID({ seed: 2 }));
});

test('Tolkowsky primary-proportion fixture preserves the independently validated optical regression', async () => {
  const { readFileSync } = await import('node:fs');
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/tolkowsky.json', import.meta.url)));
  const regression = fixture.independentEngineRegression;
  const result = evaluate(
    generate(fixture.parameters),
    materialModel(regression.material),
    regression.settings,
  );
  for (const [key, value] of Object.entries(regression.expected)) near(result[key], value, 1e-8);
});
