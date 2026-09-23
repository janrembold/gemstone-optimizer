import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate, defaults, parameters, blM5 } from '../js/cuts/blM5.js';
import { getCut } from '../js/cuts/cutDefinition.js';
import { buildPolyhedron, validateSolid } from '../js/geometry/meshBuilder.js';
import { norm, sub } from '../js/geometry/planes.js';
import { parseASC, exportASC } from '../js/export/gemcadAsc.js';
import { materialModel } from '../js/materials.js';
import { grid } from '../js/optimizer/searchSpace.js';
import { evaluate } from '../js/optics/metrics.js';
import { optimize } from '../js/optimizer/optimizer.js';
const fixture = readFileSync(new URL('./fixtures/bl-m5.asc', import.meta.url), 'utf8');
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
function samePlanes(a, b) {
  assert.equal(a.length, b.length);
  for (const f of a)
    assert.ok(b.some((g) => norm(sub(f.n, g.n)) < 1e-10 && Math.abs(f.d - g.d) < 1e-10));
}
test('BL-M5 preserves all 84 non-table ASC planes and corrects only the table to exactly zero', () => {
  assert.equal(getCut('bl-m5').id, blM5.id);
  const s = generate(),
    source = parseASC(fixture).facets,
    reference = buildPolyhedron(
      source.map((f) => (f.family === 'table' ? { ...f, n: [0, 0, 1] } : f)),
    );
  assert.ok(source.find((f) => f.family === 'table').n[1] > 1e-5);
  samePlanes(s.facets, reference.facets);
  assert.equal(s.facets.length, 85);
  assert.equal(s.vertices.length, 85);
  near(validateSolid(s).volume, validateSolid(reference).volume);
  assert.equal(validateSolid(s).edges, 168);
  for (const v of reference.vertices) assert.ok(s.vertices.some((w) => norm(sub(v, w)) < 1e-9));
  assert.deepEqual(
    s.facets.reduce((counts, f) => ((counts[f.family] = (counts[f.family] || 0) + 1), counts), {}),
    { p1: 24, girdle: 24, c1: 24, c2: 12, table: 1 },
  );
  assert.deepEqual(s.facets.find((f) => f.family === 'table').n, [0, 0, 1]);
  near(s.facets.find((f) => f.family === 'table').d, 0.30757899);
  assert.ok(s.facets.find((f) => f.family === 'girdle').n[2] > 0);
  const angle = Math.PI / 6;
  for (const v of s.vertices) {
    const r = [
      v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
      v[0] * Math.sin(angle) + v[1] * Math.cos(angle),
      v[2],
    ];
    assert.ok(s.vertices.some((w) => norm(sub(r, w)) < 1e-8));
    assert.ok(s.vertices.some((w) => norm(sub([v[0], -v[1], v[2]], w)) < 1e-8));
  }
  for (const i of s.facets.find((f) => f.family === 'table').indices)
    near(s.vertices[i][2], defaults.tableDistance);
});
test('Every BL-M5 default grid candidate keeps all 85 active facets; tier distances remain explicit', () => {
  let count = 0;
  for (const p of grid(parameters)) {
    const s = generate(p);
    assert.equal(s.facets.length, 85);
    assert.equal(validateSolid(s).euler, 2);
    count++;
  }
  assert.equal(count, 125);
  assert.throws(() => generate({ ...defaults, crown: NaN }));
  assert.throws(() => generate({ ...defaults, tableDistance: 0 }));
  assert.throws(() => generate({ ...defaults, tableDistance: 1.5 }));
});
test('BL-M5 original and perturbed geometries export without losing tiny slopes or plane distances', () => {
  for (const p of [
    defaults,
    {
      ...defaults,
      crown: defaults.crown + 0.13,
      pavilion: defaults.pavilion - 0.07,
      crown2Distance: defaults.crown2Distance + 0.001,
    },
  ]) {
    const s = generate(p),
      text = exportASC(s, materialModel('moissanite'));
    assert.match(text, /H BL-M5 -/);
    assert.match(text, /y 12 y/);
    const parsed = parseASC(text);
    samePlanes(s.facets, parsed.facets);
    near(validateSolid(s).volume, validateSolid(buildPolyhedron(parsed.facets)).volume);
  }
});
test('BL-M5 reference optics are deterministic, bounded, and conserve energy', () => {
  const s = generate(),
    m = materialModel('moissanite'),
    o = { faceRays: 256, tiltRays: 128, spectralRays: 96, fullTilt: true };
  const r = evaluate(s, m, o);
  assert.deepEqual(evaluate(s, m, o), r);
  for (const c of r.tiltCurve) near(c.useful + c.leak + c.crownOther + c.surface + c.residual, 100);
  assert.ok(r.HeadShadow >= 0 && r.HeadShadow <= r.headShadow.unobstructed);
  assert.equal(r.Symmetry, 100);
});
test('BL-M5 optimizer uses its own parameter schema, topology and equal-census verified archive', async () => {
  const config = {
    cutId: 'bl-m5',
    material: materialModel('moissanite'),
    gear: 96,
    seed: 1919,
    preset: 'fast',
    ranges: parameters,
    verification: { faceRays: 128, tiltRays: 64, spectralRays: 64 },
  };
  const leaders = [];
  const run = await optimize(config, {
    progress: (p) => {
      if (p.leaderboard.length) leaders.push(p.leaderboard[0].metrics.Global);
    },
  });
  assert.equal(run.results.length, 5);
  for (let i = 1; i < leaders.length; i++) assert.ok(leaders[i] >= leaders[i - 1]);
  near(run.results[0].metrics.Global, leaders.at(-1));
  for (const r of run.results) {
    assert.equal(r.reproduction.topologyVersion, getCut('bl-m5').version);
    assert.equal(r.derived.facetCount, 85);
    assert.equal(r.verified, true);
  }
});
