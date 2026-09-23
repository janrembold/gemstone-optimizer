import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate, parameters, defaults } from '../js/cuts/leonardo.js';
import { validateSolid, buildPolyhedron } from '../js/geometry/meshBuilder.js';
import { grid } from '../js/optimizer/searchSpace.js';
import { exportASC, parseASC } from '../js/export/gemcadAsc.js';
import { materialModel } from '../js/materials.js';
import { norm, sub } from '../js/geometry/planes.js';
import { evaluate } from '../js/optics/metrics.js';
import { optimize } from '../js/optimizer/optimizer.js';
const fit = JSON.parse(readFileSync(new URL('../docs/leonardo-fit-results.json', import.meta.url)));
test('Leonardo keeps all 56 fitted optical facets, flat table, and a closed positive girdle', () => {
  const s = generate();
  assert.equal(s.facets.length, 136);
  assert.equal(s.facets.filter((f) => f.region === 'crown').length, 21);
  assert.equal(s.facets.filter((f) => f.region === 'pavilion').length, 35);
  assert.equal(validateSolid(s).euler, 2);
  assert.ok(s.derived.girdleMin > 0);
  assert.equal(s.approximation, true);
  assert.equal(norm(sub(s.facets.find((f) => f.family === 'crown4').n, [0, 0, 1])), 0);
  const a = (2 * Math.PI) / 5;
  for (const v of s.vertices) {
    const w = [
      v[0] * Math.cos(a) - v[1] * Math.sin(a),
      v[0] * Math.sin(a) + v[1] * Math.cos(a),
      v[2],
    ];
    assert.ok(s.vertices.some((q) => norm(sub(w, q)) < 1e-7));
  }
});
test('Each of the 56 image region centers belongs to its corresponding active fitted plane', () => {
  const s = generate();
  for (const region of ['crown', 'pavilion']) {
    const facets = s.facets.filter((f) => f.region === region);
    fit.regions[region].regionCentersXY.forEach(([x, y], i) => {
      const z = facets.map((f) => (f.d - f.n[0] * x - f.n[1] * y) / f.n[2]);
      assert.equal(z.indexOf(region === 'crown' ? Math.min(...z) : Math.max(...z)), i);
    });
  }
});
test('Default Leonardo grid is valid and exports conserve planes without asserting mirror symmetry', () => {
  for (const p of grid(parameters)) {
    const s = generate(p);
    assert.equal(s.facets.length, 136);
    assert.ok(s.derived.girdleMin > 0);
  }
  const s = generate(),
    asc = exportASC(s, materialModel('moissanite'), 80);
  assert.match(asc, /y 5 n/);
  assert.match(asc, /IMAGE-FIT approximate geometry/);
  const roundtrip = buildPolyhedron(parseASC(asc).facets);
  assert.ok(Math.abs(validateSolid(s).volume - validateSolid(roundtrip).volume) < 1e-8);
  for (const f of s.facets)
    assert.ok(
      roundtrip.facets.some((g) => norm(sub(f.n, g.n)) < 1e-9 && Math.abs(f.d - g.d) < 1e-9),
    );
  assert.throws(() => generate({ ...defaults, separation: 0 }));
});
test('Leonardo optical ledger closes and separate head-shadow is bounded', () => {
  const m = evaluate(generate(), materialModel('moissanite'), {
    faceRays: 256,
    tiltRays: 128,
    spectralRays: 64,
    fullTilt: true,
  });
  for (const f of m.tiltCurve)
    assert.ok(Math.abs(f.useful + f.leak + f.crownOther + f.surface + f.residual - 100) < 1e-9);
  assert.ok(m.HeadShadow >= 0 && m.HeadShadow <= m.headShadow.unobstructed);
});
test('Leonardo runs its own scaling refinement and never drops the verified leader', async () => {
  const leaders = [];
  const run = await optimize(
    {
      cutId: 'leonardo',
      material: materialModel('moissanite'),
      gear: 80,
      seed: 1919,
      preset: 'fast',
      ranges: parameters,
      verification: { faceRays: 128, tiltRays: 64, spectralRays: 64 },
    },
    {
      progress: (p) => {
        if (p.leaderboard.length) leaders.push(p.leaderboard[0].metrics.Global);
      },
    },
  );
  assert.equal(run.results.length, 5);
  for (let i = 1; i < leaders.length; i++) assert.ok(leaders[i] >= leaders[i - 1]);
  for (const r of run.results) {
    assert.equal(r.reproduction.topologyVersion, 'leonardo-image-fit-1');
    assert.equal(r.derived.approximation, true);
  }
});
