import test from 'node:test';
import assert from 'node:assert/strict';
import { parameters } from '../js/cuts/roundBrilliant.js';
import { materialModel } from '../js/materials.js';
import { optimize, validateConfig } from '../js/optimizer/optimizer.js';
import { grid, gridSize, axis, neighbors, diverse } from '../js/optimizer/searchSpace.js';
const config = () => ({
  cutId: 'round-brilliant',
  material: materialModel('moissanite'),
  gear: 96,
  seed: 1919,
  preset: 'fast',
  ranges: parameters.map((r) => ({ ...r })),
  verification: { faceRays: 128, tiltRays: 64, spectralRays: 64 },
});
test('Coarse grid covers all endpoints and known Cartesian size', () => {
  assert.deepEqual(axis(1, 2, 0.6), [1, 1.6, 2]);
  assert.equal(gridSize(parameters), 729);
  assert.equal([...grid(parameters, 2)].length, 64);
  assert.throws(() => axis(1, 2, 0));
});
test('Precision neighborhoods stay inside user bounds', () => {
  const p = Object.fromEntries(parameters.map((r) => [r.key, r.min]));
  for (const n of neighbors(p, parameters, ['crown', 'pavilion']))
    for (const r of parameters) assert.ok(n[r.key] >= r.min && n[r.key] <= r.max);
});
test('Config validator rejects runaway search, duplicate keys and invalid census', () => {
  let c = config();
  c.verification.faceRays = NaN;
  assert.throws(() => validateConfig(c));
  c = config();
  c.ranges[0].key = 'crown';
  assert.throws(() => validateConfig(c));
  c = config();
  c.ranges.forEach((r) => (r.coarse = 0.001));
  assert.throws(() => validateConfig(c));
});
test('All five optimizer phases run, only verified equal-census candidates enter final Top 5', async () => {
  const phases = new Set(),
    run = await optimize(config(), {
      progress: (p) => {
        phases.add(p.phase);
        if (p.phase === 5) assert.ok(p.leaderboard.every((r) => r.verified));
      },
    });
  assert.deepEqual([...phases], [1, 2, 3, 4, 5]);
  assert.equal(run.results.length, 5);
  assert.equal(new Set(run.results.map((r) => JSON.stringify(r.parameters))).size, 5);
  assert.ok(
    run.results.every(
      (r) =>
        r.verified &&
        r.metrics.opticalSettings.fullTilt &&
        r.metrics.opticalSettings.faceRays === 128,
    ),
  );
  for (let i = 1; i < 5; i++)
    assert.ok(run.results[i - 1].metrics.Global >= run.results[i].metrics.Global);
});
test('Checkpoint cancellation exits instead of delivering a partial final result', async () => {
  let n = 0;
  await assert.rejects(
    optimize(config(), {
      checkpoint: async () => {
        if (++n === 4) throw new Error('Cancelled');
      },
    }),
    /Cancelled/,
  );
});

test('Final verification cannot silently use fewer samples than screening', () => {
  const c = config();
  c.verification.faceRays = 64;
  assert.throws(() => validateConfig(c), /at least twice/);
});

test('Live verified ranking never decreases and survives the final phase without a census switch', async () => {
  const leaders = [],
    settings = new Set(),
    phaseFiveLeaders = [];
  const run = await optimize(config(), {
    progress: (p) => {
      assert.ok(p.leaderboard.every((r) => r.verified));
      if (!p.leaderboard.length) return;
      const best = p.leaderboard[0];
      leaders.push(best.metrics.Global);
      settings.add(JSON.stringify(best.metrics.opticalSettings));
      if (p.phase === 5) phaseFiveLeaders.push(best.metrics.Global);
      assert.equal(p.verificationSettings.faceRays, 128);
      assert.equal(p.screeningSettings.faceRays, 64);
    },
  });
  assert.ok(leaders.length > 5);
  assert.equal(settings.size, 1);
  for (let i = 1; i < leaders.length; i++) assert.ok(leaders[i] >= leaders[i - 1]);
  assert.equal(run.results[0].metrics.Global, Math.max(...leaders));
  assert.ok(phaseFiveLeaders.length > 0);
  assert.ok(
    run.verificationHistory.some((r) => r.delta < 0),
    'Honest downward estimate corrections remain visible in the audit',
  );
  assert.ok(
    run.results.every((r) => r.screening && r.reproduction.searchVersion === run.searchVersion),
  );
});

test('Finalist selection retains the raw top K even when diversity prefers distant, weaker candidates', async () => {
  const { selectFinalists } = await import('../js/optimizer/searchSpace.js');
  const candidates = Array.from({ length: 10 }, (_, i) => ({
    id: String(i),
    parameters: { x: i < 5 ? i * 0.001 : i },
    metrics: { Global: 90 - i },
  }));
  const selected = selectFinalists(candidates, [{ key: 'x', min: 0, max: 10 }], 5);
  for (let i = 0; i < 5; i++) assert.ok(selected.some((r) => r.id === String(i)));
  assert.ok(selected.some((r) => Number(r.id) >= 5));
});
