import { getCut } from '../js/cuts/cutDefinition.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate, defaults, parameters } from '../js/cuts/roundBrilliant.js';
import { validateSolid, buildPolyhedron } from '../js/geometry/meshBuilder.js';
import { dot, sub, norm } from '../js/geometry/planes.js';
import { grid } from '../js/optimizer/searchSpace.js';
import { exportASC, parseASC } from '../js/export/gemcadAsc.js';
import { materialModel } from '../js/materials.js';
const near = (a, b, e = 1e-7) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
test('Round brilliant has true 57 + 16 semantic facets and point culet', () => {
  const s = generate();
  assert.equal(s.facets.length, 73);
  const counts = Object.fromEntries(
    [...new Set(s.facets.map((f) => f.family))].map((k) => [
      k,
      s.facets.filter((f) => f.family === k).length,
    ]),
  );
  assert.deepEqual(counts, {
    table: 1,
    bezel: 8,
    star: 8,
    upperGirdle: 16,
    pavilionMain: 8,
    lowerGirdle: 16,
    girdle: 16,
  });
  assert.equal(s.facets.find((f) => f.family === 'table').indices.length, 8);
  assert.equal(s.facets.find((f) => f.family === 'bezel').indices.length, 4);
  assert.equal(s.vertices.filter((v) => Math.hypot(v[0], v[1]) < 1e-8).length, 1);
  assert.equal(validateSolid(s).euler, 2);
});
test('Every vertex and plane maps under 45° rotation', () => {
  const s = generate(),
    a = Math.PI / 4;
  const rot = (v) => [
    v[0] * Math.cos(a) - v[1] * Math.sin(a),
    v[0] * Math.sin(a) + v[1] * Math.cos(a),
    v[2],
  ];
  for (const v of s.vertices) assert.ok(s.vertices.some((w) => norm(sub(rot(v), w)) < 1e-7));
  for (const f of s.facets)
    assert.ok(
      s.facets.some(
        (g) =>
          g.family === f.family && norm(sub(rot(f.n), g.n)) < 1e-7 && Math.abs(f.d - g.d) < 1e-7,
      ),
    );
});
test('All 729 default coarse parameter combinations are closed and noninverted', () => {
  let count = 0;
  for (const p of grid(parameters)) {
    const s = generate(p);
    assert.equal(s.facets.length, 73);
    assert.ok(validateSolid(s).volume > 0);
    count++;
  }
  assert.equal(count, 729);
});
test('Invalid parameters rejected before optics', () => {
  for (const p of [{ girdle: 0 }, { table: 99 }, { pavilion: NaN }, { star: 11, table: 80 }])
    assert.throws(() => generate({ ...defaults, ...p }));
});
test('Tolkowsky published primary proportions reproduce analytic depths', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/tolkowsky.json', import.meta.url))),
    s = generate(fixture.parameters);
  near(s.derived.crownHeight, fixture.expectedCrownHeightPct);
  near(s.derived.pavilionDepth, fixture.expectedPavilionDepthPct);
  near(s.derived.totalDepth, s.derived.crownHeight + s.derived.pavilionDepth + 3);
});
test('ASC roundtrip preserves the simulated integer-index facet planes', () => {
  for (const params of [
    defaults,
    { ...defaults, crown: 33.41, pavilion: 40.92, star: 56, lower: 78 },
  ]) {
    const s = getCut('round-brilliant').generate(params),
      asc = exportASC(s, materialModel('moissanite')),
      parsed = parseASC(asc);
    assert.equal(parsed.gear, 96);
    assert.equal(parsed.facets.length, 73);
    assert.match(asc, /I 2\.65000000/);
    for (const f of s.facets)
      assert.ok(
        parsed.facets.some((g) => norm(sub(f.n, g.n)) < 1e-8 && Math.abs(f.d - g.d) < 1e-9),
      );
    const roundtrip = buildPolyhedron(parsed.facets);
    near(validateSolid(s).volume, validateSolid(roundtrip).volume);
  }
});
test('ASC handles negative-zero culet from historic reference structure', () => {
  const s = parseASC('GemCad 5.0\ng 96 0.0\na -0.000000 1.0 96 n C\na 0.000000 0.3 96 n T');
  assert.equal(s.facets[0].n[2], -1);
  assert.equal(s.facets[1].n[2], 1);
});
test('Changing the gear requires rebuilding and resimulating the geometry', () => {
  const cut = getCut('round-brilliant'),
    a = cut.generate(defaults, 96),
    b = cut.generate(defaults, 120);
  assert.throws(() => exportASC(a, materialModel('diamond'), 120), /Indexrad/);
  assert.ok(a.facets.some((f, i) => norm(sub(f.n, b.facets[i].n)) > 1e-5));
});
