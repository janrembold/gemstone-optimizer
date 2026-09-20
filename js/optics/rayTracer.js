import { raySolid, nextBoundary } from '../geometry/intersections.js';
import { fresnel, refract } from './fresnel.js';
import { dot, rad } from '../geometry/planes.js';
export const opticalDefaults = {
  seed: 1919,
  cone: 7,
  viewCone: 64,
  maxBounces: 48,
  energyCutoff: 1e-7,
  faceRays: 3200,
  tiltRays: 2200,
  spectralRays: 800,
  fireResolution: 0.25,
  headShadowAngle: 10,
  headShadowWeight: 0.05,
};
export function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
const crown = (f) => f.region === 'crown';
// Split energy at every boundary. Exterior transmitted branches cannot re-enter a convex body.
export function traceRay(stone, o, d, ri, observer = [0, 0, 1], options = {}) {
  const opt = { ...opticalDefaults, ...options },
    out = {
      hit: false,
      useful: 0,
      environment: 0,
      headShadow: 0,
      leak: 0,
      crownOther: 0,
      surface: 0,
      residual: 0,
      entered: 0,
      bounces: 0,
      exits: [],
      entryFacet: -1,
      planeTests: 0,
    };
  const hit = raySolid(stone.packed, o, d, out);
  if (!hit || hit.enter < 0 || hit.entryFacet < 0) return out;
  out.hit = true;
  out.entryFacet = hit.entryFacet;
  const f = stone.facets[hit.entryFacet],
    c = -dot(f.n, d),
    F = fresnel(c, 1, ri),
    inside = refract(d, f.n, 1, ri);
  // Reverse observer rays: unit radiance above the stone, black below it.
  // These channels overlap the energy ledger; never add them to its sum.
  const environmentExit = (ex, ey, ez, energy) => {
    if (!opt.observerCensus || ez <= 0) return;
    out.environment += energy;
    if (
      opt.headShadowAngle > 0 &&
      ex * observer[0] + ey * observer[1] + ez * observer[2] >= Math.cos(rad(opt.headShadowAngle))
    )
      out.headShadow += energy;
  };
  environmentExit(d[0] + 2 * c * f.n[0], d[1] + 2 * c * f.n[1], d[2] + 2 * c * f.n[2], F.R);
  out.surface = F.R;
  out.entered = 1 - F.R;
  if (!inside) {
    out.residual = 1 - F.R;
    return out;
  }
  let x = o[0] + d[0] * hit.enter + inside[0] * 1e-8,
    y = o[1] + d[1] * hit.enter + inside[1] * 1e-8,
    z = o[2] + d[2] * hit.enter + inside[2] * 1e-8;
  let [dx, dy, dz] = inside,
    energy = 1 - F.R,
    path = String(hit.entryFacet);
  const view = Math.cos(rad(opt.viewCone));
  for (let b = 0; b < opt.maxBounces && energy > opt.energyCutoff; b++) {
    out.planeTests += stone.facets.length;
    const h = nextBoundary(stone.packed, x, y, z, dx, dy, dz);
    if (h.facet < 0) break;
    out.bounces++;
    x += dx * h.distance;
    y += dy * h.distance;
    z += dz * h.distance;
    const facet = stone.facets[h.facet],
      [nx, ny, nz] = facet.n,
      cos = dx * nx + dy * ny + dz * nz,
      fr = fresnel(cos, ri, 1);
    path += '.' + h.facet;
    if (!fr.tir) {
      const k = fr.cosT - ri * cos,
        ex = ri * dx + k * nx,
        ey = ri * dy + k * ny,
        ez = ri * dz + k * nz,
        e = energy * (1 - fr.R);
      environmentExit(ex, ey, ez, e);
      if (crown(facet)) {
        if (ex * observer[0] + ey * observer[1] + ez * observer[2] >= view) {
          out.useful += e;
          if (opt.collectExits)
            out.exits.push({ path, direction: [ex, ey, ez], energy: e, facet: h.facet });
        } else out.crownOther += e;
      } else out.leak += e;
    }
    energy *= fr.R;
    dx -= 2 * cos * nx;
    dy -= 2 * cos * ny;
    dz -= 2 * cos * nz;
    x += dx * 1e-8;
    y += dy * 1e-8;
    z += dz * 1e-8;
  }
  out.residual = energy;
  return out;
}
export function sampleRay(stone, random, tilt, opt) {
  const a = rad(tilt),
    observer = [Math.sin(a), 0, Math.cos(a)],
    u = [Math.cos(a), 0, -Math.sin(a)];
  // Uniform perpendicular aperture enclosing the projected solid; misses are discarded.
  let extent = 0;
  for (const v of stone.vertices) extent = Math.max(extent, Math.abs(dot(v, u)), Math.abs(v[1]));
  extent += 5 * Math.tan(rad(opt.cone));
  const px = (2 * random() - 1) * extent,
    py = (2 * random() - 1) * extent;
  const s = Math.sqrt(random()) * Math.sin(rad(opt.cone)),
    az = 2 * Math.PI * random(),
    c = Math.sqrt(1 - s * s);
  const localX = s * Math.cos(az),
    localY = s * Math.sin(az);
  const d = [localX * u[0] - c * observer[0], localY, localX * u[2] - c * observer[2]];
  // Origin in beam-normal aperture, upstream far enough for all admissible stones.
  const o = [px * u[0] + observer[0] * 3, py, px * u[2] + observer[2] * 3];
  return { o, d, observer };
}
export function census(stone, m, count, tilt = 0, options = {}) {
  const opt = { ...opticalDefaults, ...options },
    random = rng(opt.seed),
    sum = { useful: 0, leak: 0, crownOther: 0, surface: 0, residual: 0, entered: 0 },
    facets = new Float64Array(stone.facets.length);
  let hits = 0,
    attempts = 0,
    bounces = 0,
    planeTests = 0,
    usefulSquares = 0;
  while (hits < count && attempts < count * 100) {
    attempts++;
    const ray = sampleRay(stone, random, tilt, opt),
      r = traceRay(stone, ray.o, ray.d, m.ri, ray.observer, opt);
    planeTests += r.planeTests;
    if (!r.hit) continue;
    hits++;
    bounces += r.bounces;
    usefulSquares += r.useful * r.useful;
    for (const k of Object.keys(sum)) sum[k] += r[k];
    facets[r.entryFacet] += r.useful;
  }
  if (hits !== count) throw new Error('Ray aperture failed');
  return {
    ...Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, (100 * v) / hits])),
    hits,
    attempts,
    bounces,
    planeTests,
    standardError:
      100 * Math.sqrt(Math.max(0, (usefulSquares - sum.useful ** 2 / hits) / (hits - 1)) / hits),
    facets: Array.from(facets, (x) => (100 * x) / hits),
  };
}

// Optical reciprocity: parallel camera rays integrate outgoing radiance over
// the projected stone silhouette. Entry and final medium are both air.
export function observerCensus(stone, m, count, tilt = 0, options = {}) {
  const opt = { ...opticalDefaults, ...options, cone: 0, observerCensus: true };
  if (!Number.isFinite(opt.headShadowAngle) || opt.headShadowAngle < 0 || opt.headShadowAngle > 90)
    throw new Error('Head shadow half-angle must be between 0 and 90 degrees');
  const random = rng(opt.seed);
  let hits = 0,
    attempts = 0,
    environment = 0,
    blocked = 0,
    squares = 0,
    planeTests = 0;
  while (hits < count && attempts++ < count * 100) {
    const ray = sampleRay(stone, random, tilt, opt);
    const r = traceRay(stone, ray.o, ray.d, m.ri, ray.observer, opt);
    planeTests += r.planeTests;
    if (!r.hit) continue;
    hits++;
    environment += r.environment;
    blocked += r.headShadow;
    squares += r.headShadow ** 2;
  }
  if (hits !== count) throw new Error('Observer aperture failed');
  return {
    unobstructed: (100 * environment) / hits,
    headShadow: (100 * blocked) / hits,
    visible: (100 * (environment - blocked)) / hits,
    standardError:
      hits > 1
        ? 100 * Math.sqrt(Math.max(0, (squares - blocked ** 2 / hits) / (hits - 1)) / hits)
        : 0,
    halfAngle: opt.headShadowAngle,
    hits,
    planeTests,
  };
}
