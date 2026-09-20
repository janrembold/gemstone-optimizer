import { refractiveIndex, wavelengths } from '../optics/dispersion.js';
import { getCut } from '../cuts/cutDefinition.js';
import { evaluate, opticalDefaultsForRun } from './runEvaluation.js';
import { presets, grid, gridSize, neighbors, diverse, selectFinalists } from './searchSpace.js';
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
export const searchVersion = 'verified-archive-2';

export async function optimize(config, { progress = () => {}, checkpoint = async () => {} } = {}) {
  const { cut, preset } = validateConfig(config);
  const ranges = config.ranges,
    seen = new Set(),
    pool = [],
    verified = new Map();
  const verificationHistory = [],
    started = performance.now();
  const low = opticalDefaultsForRun(config, preset, false);
  const high = opticalDefaultsForRun(config, preset, true);
  const screeningUpper =
    gridSize(ranges, preset.coarseFactor) +
    preset.regions * preset.passes * ranges.length * 2 +
    preset.regions * 5 ** cut.precisionKeys.length;
  const rayWork = (o) => 2 * o.faceRays + (o.fullTilt ? 6 : 1) * o.tiltRays + 3 * o.spectralRays;
  let evaluated = 0,
    rejected = 0,
    screeningProcessed = 0,
    rayTests = 0;
  let phase = 1,
    phaseLabel = 'Coarse grid',
    current = null;
  let screeningBest = null,
    verificationPending = 2 * preset.finalists;
  let verificationInFlight = false;
  const rankedVerified = () =>
    [...verified.values()].sort(
      (a, b) => b.metrics.Global - a.metrics.Global || a.id.localeCompare(b.id),
    );
  const emit = (force = false) => {
    const screenRemaining = phase === 5 ? 0 : Math.max(0, screeningUpper - screeningProcessed);
    const remaining = screenRemaining + verificationPending + Number(verificationInFlight);
    const doneWork = screeningProcessed * rayWork(low) + verified.size * rayWork(high);
    const remainingWork =
      screenRemaining * rayWork(low) +
      (verificationPending + Number(verificationInFlight)) * rayWork(high);
    const elapsed = (performance.now() - started) / 1000;
    progress({
      phase,
      phaseLabel,
      evaluated,
      rejected,
      processed: screeningProcessed + verified.size,
      total: screeningProcessed + verified.size + remaining,
      remaining,
      percent: doneWork ? (100 * doneWork) / (doneWork + remainingWork) : 0,
      elapsed,
      eta: doneWork ? (elapsed * remainingWork) / doneWork : null,
      current,
      rayTests,
      leaderboard: rankedVerified().slice(0, 5),
      verified: true,
      screeningBest: screeningBest
        ? { parameters: screeningBest.parameters, metrics: screeningBest.metrics }
        : null,
      screeningSettings: low,
      verificationSettings: high,
      verifiedCount: verified.size,
      verificationInFlight,
      force,
    });
  };
  function makeResult(parameters, stone, metrics, optical, final) {
    const reproduction = {
      topologyVersion: cut.version,
      scoringVersion: metrics.scoringVersion,
      searchVersion,
      material: config.material,
      parameters,
      gear: config.gear,
      optical,
      optimizer: config,
    };
    return {
      id: configurationID(reproduction),
      parameters,
      derived: stone.derived,
      metrics,
      reproduction,
      verified: final,
    };
  }
  async function verify(candidate, reason) {
    const key = canonical(candidate.parameters);
    if (verified.has(key)) return verified.get(key);
    verificationInFlight = true;
    current = candidate.parameters;
    emit(true);
    await checkpoint();
    const stone = cut.generate(candidate.parameters);
    const metrics = evaluate(stone, config.material, high);
    rayTests += metrics.rayTests;
    evaluated++;
    const result = makeResult(candidate.parameters, stone, metrics, high, true);
    result.screening = { Global: candidate.metrics.Global, opticalSettings: low };
    verified.set(key, result);
    verificationHistory.push({
      id: result.id,
      parameters: result.parameters,
      phase,
      reason,
      screeningGlobal: candidate.metrics.Global,
      verifiedGlobal: metrics.Global,
      delta: metrics.Global - candidate.metrics.Global,
    });
    verificationInFlight = false;
    emit(true);
    return result;
  }
  async function screen(parameters) {
    await checkpoint();
    current = parameters;
    screeningProcessed++;
    const key = canonical(parameters);
    if (seen.has(key)) {
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
    const metrics = evaluate(stone, config.material, low);
    rayTests += metrics.rayTests;
    evaluated++;
    const candidate = makeResult(parameters, stone, metrics, low, false);
    const record = !screeningBest || metrics.Global > screeningBest.metrics.Global;
    if (record) screeningBest = candidate;
    pool.push(candidate);
    pool.sort((a, b) => b.metrics.Global - a.metrics.Global || a.id.localeCompare(b.id));
    if (pool.length > 120) pool.length = 120;
    emit();
    // Every search record is checked immediately at the unchanged final census.
    // The first five seed a useful live ranking. Never replace this archive with screening data.
    if (record || verified.size < 5)
      await verify(candidate, record ? 'screening-record' : 'initial-ranking');
  }
  emit(true);
  for (const parameters of grid(ranges, preset.coarseFactor)) await screen(parameters);
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
    for (const center of centers)
      for (const p of neighbors(center.parameters, ranges)) await screen(p);
    centers = diverse(pool, ranges, preset.regions);
  }
  phase = 4;
  phaseLabel = 'Angular precision · 0.01°';
  emit(true);
  for (const center of centers)
    for (const p of neighbors(center.parameters, ranges, cut.precisionKeys)) await screen(p);
  // Protect the raw top K AND add diverse regions. Diversity cannot remove a top-ranked candidate.
  const finalists = selectFinalists(pool, ranges, preset.finalists);
  const pending = finalists.filter((c) => !verified.has(canonical(c.parameters)));
  phase = 5;
  phaseLabel = 'Complete verification · same census';
  verificationPending = pending.length;
  emit(true);
  for (const candidate of pending) {
    verificationPending--;
    await verify(candidate, 'final-shortlist');
  }
  const results = rankedVerified().slice(0, 5);
  emit(true);
  return {
    config,
    searchVersion,
    results,
    verificationHistory,
    statistics: {
      evaluated,
      rejected,
      rayTests,
      verifiedCount: verified.size,
      screeningBestGlobal: screeningBest.metrics.Global,
      elapsed: (performance.now() - started) / 1000,
    },
  };
}
