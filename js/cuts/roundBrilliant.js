import { rad, planeThrough } from '../geometry/planes.js';
import { buildPolyhedron } from '../geometry/meshBuilder.js';
export const defaults = { table: 56, crown: 34.5, pavilion: 40.75, star: 50, lower: 75, girdle: 3 };
export const parameters = [
  { key: 'table', label: 'Table / Tafel (%)', min: 50, max: 62, coarse: 6, fine: 1 },
  { key: 'crown', label: 'Crown / Krone (°)', min: 30, max: 38, coarse: 4, fine: 0.5 },
  { key: 'pavilion', label: 'Pavilion / Pavillon (°)', min: 38, max: 44, coarse: 3, fine: 0.25 },
  { key: 'star', label: 'Star length (%)', min: 40, max: 60, coarse: 10, fine: 2 },
  { key: 'lower', label: 'Lower girdle length (%)', min: 65, max: 85, coarse: 10, fine: 2 },
  { key: 'girdle', label: 'Girdle / Rundiste (%)', min: 2, max: 4, coarse: 1, fine: 0.5 },
];
export function generate(p = defaults) {
  for (const k of Object.keys(defaults))
    if (!Number.isFinite(p[k])) throw new Error(`Invalid ${k}`);
  if (
    p.table <= 20 ||
    p.table >= 85 ||
    p.crown <= 10 ||
    p.crown >= 55 ||
    p.pavilion <= 15 ||
    p.pavilion >= 65 ||
    p.star <= 10 ||
    p.star >= 90 ||
    p.lower <= 30 ||
    p.lower >= 95 ||
    p.girdle <= 0 ||
    p.girdle > 12
  )
    throw new Error('Parameters outside supported geometric domain');
  const t = p.table / 100,
    g = p.girdle / 100,
    C = Math.tan(rad(p.crown)),
    P = Math.tan(rad(p.pavilion)),
    h = (1 - t) * C,
    H = Math.PI / 8;
  const polar = (r, a, z) => [r * Math.cos(a), r * Math.sin(a), z];
  const planes = [{ n: [0, 0, 1], d: g + h, family: 'table' }];
  const sr = t * Math.cos(H) + ((1 - t * Math.cos(H)) * p.star) / 100;
  const sz = g + C * (1 - sr * Math.cos(H));
  if (sz >= g + h - 1e-6 || sr >= Math.cos(H)) throw new Error('Star meetpoint outside crown');
  const lr = (1 - p.lower / 100) / Math.cos(H),
    lz = -g - (P * p.lower) / 100;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      b = a + Math.PI / 4,
      m = a + H;
    const G = polar(1, a, g),
      M = polar(1, m, g),
      N = polar(1, b, g),
      S = polar(sr, m, sz);
    planes.push({
      n: [
        Math.sin(rad(p.crown)) * Math.cos(a),
        Math.sin(rad(p.crown)) * Math.sin(a),
        Math.cos(rad(p.crown)),
      ],
      d: Math.sin(rad(p.crown)) + g * Math.cos(rad(p.crown)),
      family: 'bezel',
    });
    planes.push(planeThrough(polar(t, a, g + h), polar(t, b, g + h), S, 'star'));
    planes.push(planeThrough(G, M, S, 'upperGirdle'), planeThrough(M, N, S, 'upperGirdle'));
    const A = polar(1, a, -g),
      B = polar(1, m, -g),
      D = polar(1, b, -g),
      L = polar(lr, m, lz);
    planes.push({
      n: [
        Math.sin(rad(p.pavilion)) * Math.cos(a),
        Math.sin(rad(p.pavilion)) * Math.sin(a),
        -Math.cos(rad(p.pavilion)),
      ],
      d: Math.sin(rad(p.pavilion)) + g * Math.cos(rad(p.pavilion)),
      family: 'pavilionMain',
    });
    planes.push(planeThrough(A, L, B, 'lowerGirdle'), planeThrough(B, L, D, 'lowerGirdle'));
    for (const az of [a + H / 2, m + H / 2])
      planes.push({ n: [Math.cos(az), Math.sin(az), 0], d: Math.cos(H / 2), family: 'girdle' });
  }
  for (const f of planes)
    f.region = ['table', 'bezel', 'star', 'upperGirdle'].includes(f.family)
      ? 'crown'
      : f.family === 'girdle'
        ? 'girdle'
        : 'pavilion';
  const solid = buildPolyhedron(planes);
  return {
    ...solid,
    cutName: 'Round Brilliant',
    parameters: { ...p },
    topologyVersion: 'round-brilliant-1',
    symmetry: 8,
    derived: {
      crownHeight: h * 50,
      pavilionDepth: P * 50,
      totalDepth: (h + P + 2 * g) * 50,
      facetCount: solid.facets.length,
      opticalFacetCount: solid.facets.filter((f) => f.family !== 'girdle').length,
      starRadius: sr,
      lowerMeetRadius: lr,
    },
  };
}
export const roundBrilliant = {
  id: 'round-brilliant',
  name: 'Round Brilliant',
  version: 'round-brilliant-1',
  symmetry: 8,
  parameters,
  defaults,
  precisionKeys: ['crown', 'pavilion'],
  generate,
};
