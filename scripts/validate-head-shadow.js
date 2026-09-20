import { readFileSync, writeFileSync } from 'node:fs';
import { generate } from '../js/cuts/roundBrilliant.js';
import { evaluate, scoringVersion } from '../js/optics/metrics.js';
const previous = JSON.parse(readFileSync('docs/exhaustive-results.json'));
const reference = previous.results[0].parameters;
const options = { faceRays: 12800, tiltRays: 8800, spectralRays: 3200, seed: 1919 };
const candidates = [];
for (const dc of [-0.5, -0.25, 0, 0.25, 0.5]) {
  for (const dp of [-0.2, -0.1, 0, 0.1, 0.2]) {
    const parameters = {
      ...reference,
      crown: reference.crown + dc,
      pavilion: reference.pavilion + dp,
    };
    const m = evaluate(generate(parameters), previous.config.material, options);
    candidates.push({
      parameters,
      Global: m.Global,
      base: m.UnobstructedGlobal,
      HeadShadow: m.HeadShadow,
      Brilliance: m.Brilliance,
      Tilt: m.Tilt,
      Fire: m.Fire,
      Leak: m.Leak,
      headShadowSE: m.headShadow.standardError,
    });
  }
}
const baseWinner = candidates.toSorted((a, b) => b.base - a.base)[0];
const weightedWinner = candidates.toSorted((a, b) => b.Global - a.Global)[0];
// Both objectives rank exactly the same measured pool: isolate the weight from search randomness.
const checks = [];
for (const seed of [42, 2026, 12345]) {
  checks.push({
    seed,
    results: [baseWinner, weightedWinner].map(({ parameters }) => {
      const m = evaluate(generate(parameters), previous.config.material, { ...options, seed });
      return {
        parameters,
        Global: m.Global,
        base: m.UnobstructedGlobal,
        HeadShadow: m.HeadShadow,
        headShadowSE: m.headShadow.standardError,
        Brilliance: m.Brilliance,
        Tilt: m.Tilt,
      };
    }),
  });
}
const report = {
  scoringVersion,
  options,
  halfAngle: 10,
  weight: 0.05,
  reference,
  baseWinner,
  weightedWinner,
  checks,
  candidates,
};
writeFileSync('docs/head-shadow-results.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ baseWinner, weightedWinner, checks }, null, 2));
