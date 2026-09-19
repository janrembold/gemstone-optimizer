import { refractiveIndex, wavelengths } from '../optics/dispersion.js';
import { getCut } from '../cuts/cutDefinition.js';
import { evaluate, opticalDefaultsForRun } from './runEvaluation.js';
import { presets, grid, gridSize, neighbors, diverse } from './searchSpace.js';
import { configurationID, canonical } from '../reproducibility.js';
export function validateConfig(config) {
  const cut = getCut(config.cutId),
    preset = presets[config.preset];
  if (!Object.hasOwn(presets, config.preset)) throw new Error('Unknown preset');
  if (
    !config.material ||
    !Number.isFinite(config.material.ri) ||
    config.material.ri <= 1 ||
    config.material.ri > 4
  )
    throw new Error('Invalid material RI');
  if (
    wavelengths.some(
      (w) =>
        !Number.isFinite(refractiveIndex(config.material, w)) ||
        refractiveIndex(config.material, w) <= 1,
    )
  )
    throw new Error('Spectral RI must remain above 1 at every wavelength');
  if (!Number.isInteger(config.gear) || config.gear < 8 || config.gear > 1000 || config.gear % 8)
    throw new Error('Gear must be a multiple of 8');
  if (
    !Array.isArray(config.ranges) ||
    config.ranges.length !== cut.parameters.length ||
    new Set(config.ranges.map((r) => r.key)).size !== cut.parameters.length
  )
    throw new Error('Invalid parameter ranges');
  for (const p of cut.parameters) {
    const r = config.ranges.find((r) => r.key === p.key);
    if (
      !r ||
      !['min', 'max', 'coarse', 'fine'].every((k) => Number.isFinite(r[k])) ||
      r.max < r.min ||
      r.coarse <= 0 ||
      r.fine <= 0
    )
      throw new Error('Invalid range: ' + p.key);
  }
  if (gridSize(config.ranges, preset.coarseFactor) > 100000)
    throw new Error('Coarse search exceeds 100,000 combinations. Increase the coarse steps.');
  for (const key of ['faceRays', 'tiltRays', 'spectralRays'])
    if (
      !Number.isInteger(config.verification?.[key]) ||
      config.verification[key] < 32 ||
      config.verification[key] > 100000
    )
      throw new Error('Ray counts must be integers between 32 and 100,000');
  for (const key of ['faceRays', 'tiltRays', 'spectralRays'])
    if (config.verification[key] < 2 * preset[key])
      throw new Error(
        `Final ${key} must be at least ${2 * preset[key]} for ${preset.label}: verification needs at least twice the screening census.`,
      );
  if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > 4294967295)
    throw new Error('Seed must be an unsigned 32-bit integer');
  return { cut, preset };
}
export async function optimize(config, { progress = () => {}, checkpoint = async () => {} } = {}) {
  const { cut, preset } = validateConfig(config),
    ranges = config.ranges,
    seen = new Set(),
    pool = [],
    verified = [],
    started = performance.now();
  let evaluated = 0,
    rejected = 0,
    processed = 0,
    rayTests = 0,
    phase = 1,
    phaseLabel = 'Coarse grid',
    current = null;
  let total =
    gridSize(ranges, preset.coarseFactor) +
    preset.regions * preset.passes * ranges.length * 2 +
    preset.regions * 5 ** cut.precisionKeys.length +
    preset.finalists;
  const low = opticalDefaultsForRun(config, preset, false),
    high = opticalDefaultsForRun(config, preset, true);
  const emit = (force = false) =>
    progress({
      phase,
      phaseLabel,
      evaluated,
      rejected,
      processed,
      total,
      remaining: Math.max(0, total - processed),
      percent: Math.min(100, (100 * processed) / total),
      elapsed: (performance.now() - started) / 1000,
      eta: processed
        ? (((performance.now() - started) / 1000) * (total - processed)) / processed
        : null,
      current,
      rayTests,
      leaderboard:
        phase === 5
          ? [...verified].sort((a, b) => b.metrics.Global - a.metrics.Global).slice(0, 5)
          : diverse(pool, ranges, 5),
      verified: phase === 5,
      force,
    });
  async function calculate(parameters, final = false) {
    await checkpoint();
    current = parameters;
    processed++;
    const key = canonical(parameters);
    if (!final && seen.has(key)) {
      emit();
      return;
    }
    seen.add(key);
    let stone;
    try {
      stone = cut.generate(parameters);
    } catch {
      rejected++;
      emit();
      return;
    }
    const optical = final ? high : low,
      metrics = evaluate(stone, config.material, optical);
    rayTests += metrics.rayTests;
    evaluated++;
    const reproduction = {
      topologyVersion: cut.version,
      scoringVersion: metrics.scoringVersion,
      material: config.material,
      parameters,
      gear: config.gear,
      optical,
      optimizer: config,
    };
    const result = {
      id: configurationID(reproduction),
      parameters,
      derived: stone.derived,
      metrics,
      reproduction,
      verified: final,
    };
    if (final) verified.push(result);
    else {
      pool.push(result);
      pool.sort((a, b) => b.metrics.Global - a.metrics.Global);
      if (pool.length > 120) pool.length = 120;
    }
    emit();
  }
  emit(true);
  for (const p of grid(ranges, preset.coarseFactor)) await calculate(p);
  if (pool.length < 5)
    throw new Error(
      `Only ${pool.length} valid distinct geometries; broaden the ranges. ${rejected} invalid combinations rejected.`,
    );
  phase = 2;
  phaseLabel = 'Select diverse regions';
  emit(true);
  await checkpoint();
  let centers = diverse(pool, ranges, preset.regions);
  phase = 3;
  phaseLabel = 'Fine neighborhood search';
  emit(true);
  for (let pass = 0; pass < preset.passes; pass++) {
    for (const c of centers) for (const p of neighbors(c.parameters, ranges)) await calculate(p);
    centers = diverse(pool, ranges, preset.regions);
  }
  phase = 4;
  phaseLabel = 'Angular precision · 0.01°';
  emit(true);
  for (const c of centers)
    for (const p of neighbors(c.parameters, ranges, cut.precisionKeys)) await calculate(p);
  const finalists = diverse(pool, ranges, preset.finalists);
  phase = 5;
  phaseLabel = 'Independent high-census verification';
  total = processed + finalists.length;
  emit(true);
  for (const c of finalists) await calculate(c.parameters, true);
  const results = verified
    .sort((a, b) => b.metrics.Global - a.metrics.Global || a.id.localeCompare(b.id))
    .slice(0, 5);
  emit(true);
  return {
    config,
    results,
    statistics: { evaluated, rejected, rayTests, elapsed: (performance.now() - started) / 1000 },
  };
}
