import { census, observerCensus, rng, sampleRay, traceRay, opticalDefaults } from './rayTracer.js';
import { refractiveIndex, hasDispersion, wavelengths } from './dispersion.js';
import { dot, deg, cross, norm } from '../geometry/planes.js';
export const scoringVersion = 'independent-energy-2-head-shadow';
export const scintillation = (n) => 100 * (1 - Math.exp(-n / 45));
export function scores(
  { Brilliance, Fire, Tilt, Scintillation, Symmetry, Leak, HeadShadow = 0 },
  weight = opticalDefaults.headShadowWeight,
) {
  if (!Number.isFinite(weight) || weight < 0 || weight > 1)
    throw new Error('Invalid head shadow weight');
  const UnobstructedGlobal =
    0.34 * Brilliance +
    0.2 * Fire +
    0.16 * Tilt +
    0.1 * Scintillation +
    0.1 * Symmetry +
    0.1 * (100 - Leak);
  return {
    Global: (1 - weight) * UnobstructedGlobal + weight * (100 - HeadShadow),
    UnobstructedGlobal,
    minimumMetric: Math.min(Brilliance, Fire, Tilt, Scintillation, 100 - Leak),
  };
}
export function spectralCensus(stone, m, options = {}) {
  const opt = { ...opticalDefaults, ...options },
    random = rng(opt.seed),
    indices = wavelengths.map((n) => refractiveIndex(m, n));
  let hits = 0,
    attempts = 0,
    matchedEnergy = 0,
    separatedEnergy = 0,
    angleEnergy = 0,
    bounces = 0,
    planeTests = 0;
  while (hits < opt.spectralRays && attempts < opt.spectralRays * 100) {
    attempts++;
    const ray = sampleRay(stone, random, 0, opt);
    const results = indices.map((ri) =>
      traceRay(stone, ray.o, ray.d, ri, ray.observer, { ...opt, collectExits: true }),
    );
    planeTests += results.reduce((s, r) => s + r.planeTests, 0);
    if (!results[0].hit) continue;
    hits++;
    bounces += results.reduce((s, r) => s + r.bounces, 0);
    // Match entire facet histories: unrelated red/blue exit paths must not masquerade as dispersion.
    const maps = results.map((r) => new Map(r.exits.map((e) => [e.path, e])));
    for (const [path, r] of maps[0]) {
      const g = maps[1].get(path),
        b = maps[2].get(path);
      if (!g || !b) continue;
      const energy = Math.min(r.energy, g.energy, b.energy);
      const angle = deg(
        Math.atan2(norm(cross(r.direction, b.direction)), dot(r.direction, b.direction)),
      );
      matchedEnergy += energy;
      angleEnergy += energy * angle;
      if (angle >= opt.fireResolution) separatedEnergy += energy;
    }
  }
  return {
    score: hits ? (100 * separatedEnergy) / hits : 0,
    meanSeparationDeg: matchedEnergy ? angleEnergy / matchedEnergy : 0,
    matchedEnergyPct: hits ? (100 * matchedEnergy) / hits : 0,
    hits,
    attempts,
    bounces,
    planeTests,
    wavelengths,
    available: hasDispersion(m),
    provisional: true,
  };
}
export function evaluate(stone, m, options = {}) {
  const opt = { ...opticalDefaults, ...options };
  const headShadow = observerCensus(stone, m, opt.faceRays, 0, opt);
  const face = census(stone, m, opt.faceRays, 0, opt),
    angles = opt.fullTilt ? [0, 5, 10, 15, 20, 25, 30] : [0, 20];
  const tiltCurve = angles.map((angle) => ({
    angle,
    ...(angle === 0 ? face : census(stone, m, opt.tiltRays, angle, opt)),
  }));
  const fire = spectralCensus(stone, m, opt),
    t20 = tiltCurve.find((x) => x.angle === 20);
  const metrics = {
    Brilliance: face.useful,
    Fire: fire.score,
    Tilt: face.useful > 1e-10 ? Math.min(100, (100 * t20.useful) / face.useful) : 0,
    Scintillation: scintillation(stone.facets.length),
    Symmetry: 100,
    Leak: face.leak,
    HeadShadow: headShadow.headShadow,
  };
  return {
    ...metrics,
    ...scores(metrics, opt.headShadowWeight),
    headShadow,
    face,
    fire,
    tiltCurve,
    opticalSettings: opt,
    scoringVersion,
    provisional: true,
    rayCount: headShadow.hits + tiltCurve.reduce((s, r) => s + r.hits, 0) + fire.hits * 3,
    rayTests:
      headShadow.planeTests + tiltCurve.reduce((s, r) => s + r.planeTests, 0) + fire.planeTests,
  };
}
