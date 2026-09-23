import test from 'node:test';
import assert from 'node:assert/strict';
import { getCut } from '../js/cuts/cutDefinition.js';
import { defaults, parameters, tierCrossings } from '../js/cuts/leoJR.js';
import { validateSolid, buildPolyhedron } from '../js/geometry/meshBuilder.js';
import { grid } from '../js/optimizer/searchSpace.js';
import { exportASC, parseASC } from '../js/export/gemcadAsc.js';
import { materialModel } from '../js/materials.js';
import { evaluate } from '../js/optics/metrics.js';
import { optimize } from '../js/optimizer/optimizer.js';
const cut = getCut('leo-jr'),
  material = materialModel('moissanite');
const tiers = [
  ['pavilionBase', 20],
  ['pavilionMiddle', 10],
  ['pavilionTip', 5],
];
function checkTiers(s, p, gear) {
  assert.equal(s.facets.length, 76);
  assert.equal(s.facets.filter((f) => f.region === 'crown').length, 21);
  assert.equal(s.facets.filter((f) => f.region === 'girdle').length, 20);
  const angles = new Set();
  for (const [name, count] of tiers) {
    const facets = s.facets.filter((f) => f.family === name);
    assert.equal(facets.length, count);
    assert.equal(new Set(facets.map((f) => f.d.toFixed(12))).size, 1);
    for (const f of facets) {
      const angle = (Math.acos(-f.n[2]) * 180) / Math.PI;
      assert.ok(Math.abs(angle - p[name]) < 1e-10);
      angles.add(angle.toFixed(8));
      const index = (Math.atan2(f.n[1], f.n[0]) * gear) / (2 * Math.PI);
      assert.ok(Math.abs(index - Math.round(index)) < 1e-10);
    }
  }
  assert.equal(angles.size, 3);
  const indices = s.facets
    .filter((f) => f.family === 'pavilionBase')
    .map((f) => Math.round(((Math.atan2(f.n[1], f.n[0]) * gear) / (2 * Math.PI) + gear) % gear))
    .sort((a, b) => a - b);
  assert.deepEqual(
    indices,
    Array.from({ length: 20 }, (_, i) => (i * gear) / 20),
  );
  const base = s.facets.filter((f) => f.family === 'pavilionBase');
  for (const f of s.facets.filter((f) => f.region === 'girdle')) {
    const owner = base[f.pavilionOwner],
      r = Math.hypot(owner.n[0], owner.n[1]);
    assert.ok(
      Math.abs(f.n[0] - owner.n[0] / r) < 1e-12 && Math.abs(f.n[1] - owner.n[1] / r) < 1e-12,
    );
    assert.ok(Math.abs(f.d - 1) < 1e-12);
    const bottom = f.indices.filter((i) => Math.abs(s.vertices[i][2] + p.separation / 200) < 1e-8);
    assert.equal(bottom.length, 2);
    assert.ok(bottom.every((i) => owner.indices.includes(i)));
  }
}
test('Leo JR has exactly three common pavilion angles, regular basis and matching girdle throughout its grids', () => {
  for (const gear of [40, 80, 160])
    for (const p of grid(parameters)) {
      const s = cut.generate(p, gear);
      checkTiers(s, p, gear);
      assert.equal(validateSolid(s).euler, 2);
      assert.ok(s.derived.girdleMin > 0);
      assert.deepEqual(s.facets.find((f) => f.family === 'crown4').n, [0, 0, 1]);
    }
});
test('ASC contains exactly P1/P2/P3 with 20/10/5 integer positions and identical simulated planes', () => {
  for (const p of [
    defaults,
    { ...defaults, pavilionBase: 40.51, pavilionMiddle: 40.02, pavilionTip: 37.83 },
  ]) {
    const s = cut.generate(p),
      asc = exportASC(s, material, 80);
    const lines = asc.split(/\r?\n/).filter((l) => /^a -/.test(l) && !/^a -90\./.test(l));
    assert.equal(lines.length, 3);
    lines.forEach((line, i) => {
      const t = line.split(/\s+/);
      assert.equal(t[5], `P${i + 1}`);
      assert.equal([t[3], ...t.slice(6)].length, tiers[i][1]);
      assert.ok([t[3], ...t.slice(6)].every((x) => /^\d+$/.test(x)));
    });
    const restored = buildPolyhedron(parseASC(asc).facets);
    assert.ok(Math.abs(validateSolid(s).volume - validateSolid(restored).volume) < 1e-8);
    for (const f of s.facets)
      assert.ok(
        restored.facets.some(
          (g) => Math.hypot(...f.n.map((x, i) => x - g.n[i])) < 1e-9 && Math.abs(f.d - g.d) < 1e-9,
        ),
      );
  }
});
test('Tier crossings come from the image fit and changing pavilion angles leaves crown planes fixed', () => {
  assert.ok(Math.abs(tierCrossings.baseToMiddle - 0.7125980416177897) < 1e-10);
  assert.ok(Math.abs(tierCrossings.middleToTip - 0.4650335546884374) < 1e-10);
  const a = cut.generate(),
    b = cut.generate({ ...defaults, pavilionBase: 40.6, pavilionMiddle: 39.95, pavilionTip: 37.7 });
  const planes = (s) =>
    s.facets.filter((f) => f.region === 'crown').map((f) => ({ n: f.n, d: f.d }));
  assert.deepEqual(planes(a), planes(b));
});
test('Invalid tier collapse, ordering, index gear and nonfinite angles are rejected', () => {
  for (const p of [
    { pavilionBase: 40.15 },
    { pavilionMiddle: 37.9 },
    { pavilionTip: 42 },
    { pavilionMiddle: NaN },
    { separation: 0 },
  ])
    assert.throws(() => cut.generate({ ...defaults, ...p }));
  assert.throws(() => cut.generate(defaults, 96), /Symmetrie/);
});
test('Three-tier Leo JR preserves optical energy accounting', () => {
  const m = evaluate(cut.generate(), material, {
    faceRays: 256,
    tiltRays: 128,
    spectralRays: 64,
    fullTilt: true,
  });
  for (const t of m.tiltCurve)
    assert.ok(Math.abs(t.useful + t.leak + t.crownOther + t.surface + t.residual - 100) < 1e-9);
  assert.ok(m.HeadShadow >= 0 && m.HeadShadow <= m.headShadow.unobstructed);
});
test('Optimizer changes only shared tier angles and retains monotonic verified ranking', async () => {
  const leaders = [];
  const run = await optimize(
    {
      cutId: cut.id,
      material,
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
    checkTiers(cut.generate(r.parameters, 80), r.parameters, 80);
    assert.equal(r.reproduction.topologyVersion, cut.version);
  }
});
