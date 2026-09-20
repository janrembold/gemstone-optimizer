import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { format } from 'prettier';
import { optimize } from '../js/optimizer/optimizer.js';
import { parameters } from '../js/cuts/roundBrilliant.js';
import { materialModel } from '../js/materials.js';
const config = {
  cutId: 'round-brilliant',
  material: materialModel('moissanite'),
  gear: 96,
  seed: 1919,
  preset: 'exhaustive',
  ranges: parameters.map(({ key, min, max, coarse, fine }) => ({ key, min, max, coarse, fine })),
  verification: { faceRays: 3200, tiltRays: 2200, spectralRays: 800 },
};
let best = -Infinity,
  lastPhase = 0,
  nextMilestone = 2000;
const liveImprovements = [],
  phases = [],
  settings = new Set();
const run = await optimize(config, {
  progress: (p) => {
    const leader = p.leaderboard[0];
    assert.ok(p.leaderboard.every((r) => r.verified));
    if (leader) {
      assert.ok(leader.metrics.Global >= best, 'A displayed verified leader must never be lost');
      settings.add(JSON.stringify(leader.metrics.opticalSettings));
      if (leader.metrics.Global > best)
        liveImprovements.push({
          phase: p.phase,
          evaluated: p.evaluated,
          Global: leader.metrics.Global,
          id: leader.id,
        });
      best = leader.metrics.Global;
    }
    if (p.phase !== lastPhase) {
      lastPhase = p.phase;
      const state = {
        phase: p.phase,
        evaluated: p.evaluated,
        verifiedBest: leader?.metrics.Global ?? null,
        screeningBest: p.screeningBest?.metrics.Global ?? null,
      };
      phases.push(state);
      console.log(JSON.stringify(state));
    }
    if (p.evaluated >= nextMilestone) {
      console.log(
        JSON.stringify({ evaluated: p.evaluated, elapsed: p.elapsed, verifiedBest: best }),
      );
      nextMilestone += 2000;
    }
  },
});
assert.equal(settings.size, 1);
assert.equal(run.results[0].metrics.Global, best);
const baselinePath = process.argv[2];
const baseline =
  baselinePath && existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : null;
const report = {
  generatedAt: new Date().toISOString(),
  config,
  searchVersion: run.searchVersion,
  phases,
  liveImprovements,
  verifiedRankingMonotonic: true,
  identicalCensusThroughout: true,
  baseline: baseline
    ? {
        phasePeaks: baseline.phasePeaks,
        finalBest: baseline.run.results[0].metrics.Global,
        statistics: baseline.run.statistics,
      }
    : null,
  statistics: run.statistics,
  verificationHistory: run.verificationHistory,
  results: run.results.map((r) => ({
    id: r.id,
    parameters: r.parameters,
    screeningGlobal: r.screening.Global,
    Global: r.metrics.Global,
    Brilliance: r.metrics.Brilliance,
    Fire: r.metrics.Fire,
    Tilt: r.metrics.Tilt,
    Leak: r.metrics.Leak,
  })),
};
writeFileSync('docs/exhaustive-results.json', JSON.stringify(report, null, 2) + '\n');
const f = (n) => n.toFixed(6);
const markdown = `# Exhaustive evaluation audit

Generated ${report.generatedAt}, default Moissanite, seed 1919. Full 15,625-point coarse grid, fine and precision neighborhoods, and final shortlist. All values below are actual independent simulation outputs.

## Reproduced issue

${
  baseline
    ? `Before the fix, the highest screening score was **${f(
        Math.max(
          ...Object.entries(baseline.phasePeaks)
            .filter(([phase]) => Number(phase) < 5)
            .map(([, value]) => value),
        ),
      )}**, while the best final verified score was **${f(baseline.run.results[0].metrics.Global)}**. These were different sampling budgets presented in the same ranking.`
    : 'To compare an older run, pass its captured diagnostic JSON as the first argument. No historical value is invented.'
}

Screening uses 384 face-up / 192 tilt / 192 spectral triplets. Verification uses 3,200 face-up / 2,200 per tilt / 800 spectral triplets and the full seven-angle curve. Selecting the largest estimate from many geometries preferentially selects sampling overestimates. Refinement late in the run can improve the screening objective without the same gain in the higher census. The screening estimate is not a measured convergence guarantee.

## Verified ranking after the fix

- Every displayed ranking value uses exactly the same higher census, seed and physics settings from the first candidate onward.
- Every new screening record is verified immediately and archived. The initial candidates populate the live ranking.
- No archived verified candidate is discarded at the final phase.
- The final shortlist includes the raw top K **and** geometrically diverse candidates; diversity cannot displace a raw top-K candidate.
- Assertion over every progress event: verified leader never decreases (**passed**).
- Assertion: final winner equals the largest live verified value (**passed**).
- Best final verified Global: **${f(best)}**. Highest screening estimate (separate, not the displayed ranking): **${f(run.statistics.screeningBestGlobal)}**.
- ${run.statistics.verifiedCount} unique geometries verified, ${run.statistics.evaluated} optical evaluations, ${run.statistics.rayTests} ray/plane tests, ${run.statistics.elapsed.toFixed(2)} seconds on this machine.

| ID | Screening estimate | Verified Global | Brilliance | Fire | Tilt | Leak |
| --- | --- | --- | --- | --- | --- | --- |
${report.results.map((r) => `| ${r.id} | ${f(r.screeningGlobal)} | ${f(r.Global)} | ${f(r.Brilliance)} | ${f(r.Fire)} | ${f(r.Tilt)} | ${f(r.Leak)} |`).join('\n')}

The raw [audit JSON](exhaustive-results.json) preserves each screening-to-verification correction, including downward corrections. Values are never clamped upward or replaced by the best optimistic estimate. This change improves comparison and candidate retention; it does not remove Monte Carlo uncertainty, certify a perception score, or prove a global optimum.

Re-run with \`node scripts/validate-exhaustive.js\`. Physics and metric definitions are unchanged; the search version is \`${run.searchVersion}\`.
`;
writeFileSync(
  'docs/EXHAUSTIVE-VALIDATION.md',
  await format(markdown, { parser: 'markdown', printWidth: 100 }),
);
console.log(JSON.stringify({ best, statistics: run.statistics, baseline: report.baseline }));
