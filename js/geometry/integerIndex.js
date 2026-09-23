import { buildPolyhedron } from './meshBuilder.js';
const TAU = 2 * Math.PI;
export const indexingVersion = 'integer-orbits-1';
const mod = (x, n) => ((x % n) + n) % n;
export function validateGear(gear, symmetry) {
  if (!Number.isInteger(gear) || gear < 8 || gear > 1000 || gear % 8 || gear % symmetry)
    throw new Error(
      `Indexrad muss durch 8 und die ${symmetry}-fache Symmetrie teilbar sein (8–1000).`,
    );
}
// Minimum squared displacement, preserving cyclic order and distinct positions.
export function integerSlots(values, slots) {
  if (values.length > slots) throw new Error('Indexrad zu grob für getrennte Facettenpositionen.');
  let best = null;
  for (let shift = -values.length; shift <= values.length; shift++) {
    let dp = Array(slots + 1)
      .fill(null)
      .map(() => ({ cost: 0, path: [] }));
    for (let i = 0; i < values.length; i++) {
      const next = Array(slots + 1).fill(null);
      for (let j = 1; j <= slots; j++) {
        const prev = dp[j - 1],
          position = j - 1 + shift;
        const take = prev && {
          cost: prev.cost + (position - values[i]) ** 2,
          path: [...prev.path, position],
        };
        next[j] = !take
          ? next[j - 1]
          : !next[j - 1] || take.cost < next[j - 1].cost
            ? take
            : next[j - 1];
      }
      dp = next;
    }
    const candidate = dp[slots];
    if (candidate && (!best || candidate.cost < best.cost - 1e-12)) best = candidate;
  }
  return best.path.map((v) => mod(v, slots));
}
export function indexedOpticalPlanes(stone, gear, skipGirdle = false) {
  validateGear(gear, stone.symmetry);
  const sector = gear / stone.symmetry,
    groups = new Map();
  const phaseOf = (f) => {
    const v = mod((Math.atan2(f.n[1], f.n[0]) * gear) / TAU, sector);
    return Math.abs(v - sector) < 1e-7 || v < 1e-7 ? 0 : v;
  };
  for (const region of skipGirdle ? ['crown', 'pavilion'] : ['crown', 'pavilion', 'girdle']) {
    const phases = [
      ...new Set(
        stone.facets
          .filter((f) => f.region === region && Math.hypot(f.n[0], f.n[1]) > 1e-10)
          .map((f) => phaseOf(f).toFixed(7)),
      ),
    ]
      .map(Number)
      .sort((a, b) => a - b);
    const positions = integerSlots(phases, sector);
    phases.forEach((v, i) => groups.set(region + ':' + v.toFixed(7), positions[i]));
  }
  return stone.facets.map((f) => {
    const horizontal = Math.hypot(f.n[0], f.n[1]);
    if (horizontal < 1e-10) return { ...f, n: [0, 0, Math.sign(f.n[2])] };
    const old = (Math.atan2(f.n[1], f.n[0]) * gear) / TAU;
    const phase = phaseOf(f),
      chosen = groups.get(f.region + ':' + phase.toFixed(7));
    const index =
      chosen == null ? Math.round(old) : Math.round((old - phase) / sector) * sector + chosen;
    const az = (index * TAU) / gear;
    const n = [horizontal * Math.cos(az), horizontal * Math.sin(az), f.n[2]];
    if (Math.hypot(...n.map((x, i) => x - f.n[i])) < 1e-12) return { ...f, n };
    // Rotate through the existing facet centroid, not through the origin.
    const center = f.indices.reduce(
      (a, i) => a.map((x, j) => x + stone.vertices[i][j] / f.indices.length),
      [0, 0, 0],
    );
    return { ...f, n, d: n.reduce((a, x, i) => a + x * center[i], 0) };
  });
}
export function finishIndexed(stone, planes, gear) {
  for (const f of planes) {
    if (Math.hypot(f.n[0], f.n[1]) < 1e-10) continue;
    const index = (Math.atan2(f.n[1], f.n[0]) * gear) / TAU;
    if (Math.abs(index - Math.round(index)) > 1e-7)
      throw new Error('Nicht-ganzzahlige Simulationsgeometrie.');
  }
  const solid = buildPolyhedron(planes),
    vs = solid.vertices;
  const diameter = 2 * Math.max(...vs.map((v) => Math.hypot(v[0], v[1])));
  const table = solid.facets.find((f) => f.n[2] === 1);
  const tv = table ? table.indices.map((i) => vs[i]) : [];
  const crown = planes.filter((f) => f.region === 'crown'),
    pavilion = planes.filter((f) => f.region === 'pavilion');
  const thickness = solid.facets
    .filter((f) => f.region === 'girdle')
    .flatMap((f) =>
      f.indices.map((i) => {
        const [x, y] = vs[i];
        const z = (fs) => fs.map((f) => (f.d - f.n[0] * x - f.n[1] * y) / f.n[2]);
        return (100 * (Math.min(...z(crown)) - Math.max(...z(pavilion)))) / diameter;
      }),
    );
  if (Math.min(...thickness) <= 1e-7)
    throw new Error('Ganzzahlige Geometrie schließt die Rundiste.');
  return {
    ...stone,
    ...solid,
    gear,
    indexingVersion,
    symmetryMirror: false,
    topologyVersion: stone.topologyVersion + '-' + indexingVersion,
    derived: {
      ...stone.derived,
      facetCount: solid.facets.length,
      opticalFacetCount: solid.facets.filter((f) => f.region !== 'girdle').length,
      totalDepth:
        (100 * (Math.max(...vs.map((v) => v[2])) - Math.min(...vs.map((v) => v[2])))) / diameter,
      tableWidth:
        (100 *
          Math.max(...tv.flatMap((a) => tv.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1]))))) /
        diameter,
      girdleMin: Math.min(...thickness),
      girdleMax: Math.max(...thickness),
      indexingVersion,
    },
  };
}
