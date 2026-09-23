import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cuts, getCut } from '../js/cuts/cutDefinition.js';
import { integerSlots, indexedOpticalPlanes, finishIndexed } from '../js/geometry/integerIndex.js';
import { exportASC, parseASC, manufacturingReport } from '../js/export/gemcadAsc.js';
import { buildPolyhedron, validateSolid } from '../js/geometry/meshBuilder.js';
import { grid } from '../js/optimizer/searchSpace.js';
import { evaluate } from '../js/optics/metrics.js';
import { materialModel } from '../js/materials.js';
import { optimize } from '../js/optimizer/optimizer.js';
const material = materialModel('moissanite');
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
function assertIndices(stone, gear) {
  assert.equal(manufacturingReport(stone, gear).fractional, 0);
  const asc = exportASC(stone, material, gear);
  for (const line of asc.split(/\r?\n/).filter((l) => l.startsWith('a '))) {
    const t = line.split(/\s+/);
    for (const token of [t[3], ...t.slice(6)]) assert.match(token, /^\d+$/);
  }
  const parsed = parseASC(asc),
    rebuilt = buildPolyhedron(parsed.facets);
  assert.equal(parsed.facets.length, stone.facets.length);
  assert.ok(Math.abs(validateSolid(stone).volume - validateSolid(rebuilt).volume) < 1e-8);
  for (const f of stone.facets)
    assert.ok(
      rebuilt.facets.some(
        (g) => Math.hypot(...f.n.map((x, i) => x - g.n[i])) < 1e-9 && Math.abs(f.d - g.d) < 1e-9,
      ),
    );
  return rebuilt;
}
test('All registered families simulate integer teeth over their complete default coarse grids', () => {
  for (const cut of cuts.values()) {
    const gear = cut.defaultGear || 96;
    let valid = 0,
      rejected = 0;
    for (const p of grid(cut.parameters)) {
      let stone;
      try {
        stone = cut.generate(p, gear);
      } catch {
        rejected++;
        continue;
      }
      assert.equal(manufacturingReport(stone, gear).fractional, 0);
      assert.equal(validateSolid(stone).euler, 2);
      valid++;
    }
    assert.ok(valid >= 5, `${cut.id}: ${valid} valid, ${rejected} rejected`);
    assertIndices(cut.generate(), gear);
  }
});
test('Provided Leonardo ASC retains all facets and inclinations with only integer positions', () => {
  const input = parseASC(
    readFileSync(new URL('./fixtures/leonardo-fractional.asc', import.meta.url), 'utf8'),
  );
  const raw = {
    ...buildPolyhedron(input.facets),
    symmetry: 5,
    topologyVersion: 'fixture',
    derived: {},
  };
  assert.equal(manufacturingReport(raw, 80).fractional, 55);
  assert.throws(() => exportASC(raw, material, 80), /Gebrochener Index/);
  const stone = finishIndexed(raw, indexedOpticalPlanes(raw, 80), 80);
  assert.equal(stone.facets.length, raw.facets.length);
  stone.facets.forEach((f, i) => assert.ok(Math.abs(f.n[2] - raw.facets[i].n[2]) < 1e-12));
  const rebuilt = assertIndices(stone, 80);
  const options = { faceRays: 512, tiltRays: 256, spectralRays: 128, fullTilt: true };
  const a = evaluate(stone, material, options),
    b = evaluate({ ...rebuilt, symmetry: 5 }, material, options);
  assert.ok(Math.abs(a.Global - b.Global) < 1e-6);
  for (const t of a.tiltCurve)
    assert.ok(Math.abs(t.useful + t.leak + t.surface + t.crownOther + t.residual - 100) < 1e-9);
});
test('Leo JR has exactly 20 integer girdle facets with real pavilion attachment edges', () => {
  const cut = getCut('leo-jr');
  for (const gear of [80, 160])
    for (const p of grid(cut.parameters)) {
      const s = cut.generate(p, gear),
        pv = s.facets.filter((f) => f.region === 'pavilion');
      const girdle = s.facets.filter((f) => f.region === 'girdle');
      assert.equal(s.facets.length, 76);
      assert.equal(s.facets.filter((f) => f.region === 'crown').length, 21);
      assert.equal(pv.length, 35);
      assert.equal(girdle.length, 20);
      assert.equal(new Set(girdle.map((f) => f.pavilionFamily)).size, 1);
      assert.equal(manufacturingReport(s, gear).fractional, 0);
      for (const f of girdle) {
        const owner = pv[f.pavilionOwner],
          r = Math.hypot(owner.n[0], owner.n[1]);
        assert.ok(Math.hypot(f.n[0] - owner.n[0] / r, f.n[1] - owner.n[1] / r) < 1e-10);
        const shared = f.indices.filter(
          (i) => Math.abs(dot(owner.n, s.vertices[i]) - owner.d) < 1e-8,
        );
        assert.equal(shared.length, 2);
        // A real common edge, not merely two disconnected points on the plane.
        assert.ok(owner.indices.includes(shared[0]) && owner.indices.includes(shared[1]));
        const adjacent = (ids, a, b) =>
          Math.abs(ids.indexOf(a) - ids.indexOf(b)) === 1 ||
          Math.abs(ids.indexOf(a) - ids.indexOf(b)) === ids.length - 1;
        assert.ok(adjacent(f.indices, ...shared) && adjacent(owner.indices, ...shared));
        for (const i of shared) assert.ok(Math.abs(s.vertices[i][2] + p.separation / 200) < 1e-8);
        for (const i of f.indices)
          assert.ok(Math.abs(Math.hypot(...s.vertices[i].slice(0, 2)) - 1) < 0.03);
      }
      const angle = (2 * Math.PI) / 5;
      for (const v of s.vertices) {
        const w = [
          v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
          v[0] * Math.sin(angle) + v[1] * Math.cos(angle),
          v[2],
        ];
        assert.ok(s.vertices.some((q) => Math.hypot(...q.map((x, i) => x - w[i])) < 1e-7));
      }
      const restored = assertIndices(s, gear);
      assert.equal(restored.facets.filter((f) => f.region === 'girdle').length, 20);
    }
});
test('Integer assignment separates close facets and rejects incompatible gears', () => {
  assert.deepEqual(
    integerSlots([5.07658, 7.53533, 7.66415, 9.77747, 11.84503, 11.92339, 14.80089], 16),
    [5, 7, 8, 10, 11, 12, 15],
  );
  assert.throws(() => getCut('leonardo').generate(undefined, 96), /Symmetrie/);
  assert.throws(() => integerSlots([0, 0.1, 0.2], 2), /grob/);
  for (const [id, gear] of [
    ['round-brilliant', 120],
    ['bl-m5', 192],
    ['leonardo', 160],
    ['leo-jr', 160],
  ])
    assertIndices(getCut(id).generate(undefined, gear), gear);
});
test('Verified optimizer results reproduce the simulated integer geometry and optics', async () => {
  const cut = getCut('leo-jr'),
    verification = { faceRays: 128, tiltRays: 64, spectralRays: 64 };
  const run = await optimize({
    cutId: cut.id,
    gear: 80,
    seed: 1919,
    preset: 'fast',
    ranges: cut.parameters,
    material,
    verification,
  });
  for (const r of run.results) {
    const stone = cut.generate(r.parameters, r.reproduction.gear);
    assert.equal(stone.facets.filter((f) => f.region === 'girdle').length, 20);
    assertIndices(stone, 80);
    assert.equal(evaluate(stone, material, r.reproduction.optical).Global, r.metrics.Global);
    assert.equal(r.reproduction.topologyVersion, stone.topologyVersion);
  }
});
