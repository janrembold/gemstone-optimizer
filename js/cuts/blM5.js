import { rad } from '../geometry/planes.js';
import { buildPolyhedron } from '../geometry/meshBuilder.js';

// Measured ASC half-spaces, in the original girdle-apothem = 1 coordinate system.
// User correction: table normal is exactly +Z; its ASC distance is retained.
// The original slight girdle cone is preserved.
export const defaults = {
  pavilion: 41.494175,
  crown: 32.221737,
  crown2: 30.079455,
  pavilionDistance: 0.68520846,
  crownDistance: 0.5587961,
  crown2Distance: 0.53960117,
  tableDistance: 0.30757899,
};
export const parameters = [
  ...[
    ['pavilion', 'Pavillon p1 (°)'],
    ['crown', 'Krone c1 (°)'],
    ['crown2', 'Krone c2 (°)'],
  ].map(([key, label]) => ({
    key,
    label,
    min: defaults[key] - 0.2,
    max: defaults[key] + 0.2,
    coarse: 0.1,
    fine: 0.05,
  })),
  ...[
    ['pavilionDistance', 'Abstand p1 (Rundisten-Apothem)'],
    ['crownDistance', 'Abstand c1 (Rundisten-Apothem)'],
    ['crown2Distance', 'Abstand c2 (Rundisten-Apothem)'],
    ['tableDistance', 'Abstand T (Rundisten-Apothem)'],
  ].map(([key, label]) => ({
    key,
    label,
    min: defaults[key],
    max: defaults[key],
    coarse: 0.005,
    fine: 0.001,
  })),
];
export function generate(p = defaults) {
  for (const key of Object.keys(defaults))
    if (!Number.isFinite(p[key])) throw new Error(`Invalid ${key}`);
  for (const key of ['pavilion', 'crown', 'crown2'])
    if (p[key] < 15 || p[key] > 60) throw new Error(`Unsupported angle: ${key}`);
  for (const key of ['pavilionDistance', 'crownDistance', 'crown2Distance', 'tableDistance'])
    if (p[key] <= 0 || p[key] > 1.5) throw new Error(`Unsupported plane distance: ${key}`);
  const indices24 = Array.from({ length: 24 }, (_, i) => 2 + 4 * i);
  const tiers = [
    ['p1', 'pavilion', -p.pavilion, p.pavilionDistance, indices24],
    ['girdle', 'girdle', 89.999875, 1, indices24],
    ['c1', 'crown', p.crown, p.crownDistance, indices24],
    [
      'c2',
      'crown',
      p.crown2,
      p.crown2Distance,
      Array.from({ length: 12 }, (_, i) => (i ? 8 * i : 96)),
    ],
    ['table', 'crown', 0, p.tableDistance, [96]],
  ];
  const planes = tiers.flatMap(([family, region, angle, d, indices]) =>
    indices.map((index) => {
      const a = rad(Math.abs(angle)),
        az = (index * 2 * Math.PI) / 96;
      return {
        family,
        region,
        n:
          angle === 0
            ? [0, 0, 1]
            : [
                Math.sin(a) * Math.cos(az),
                Math.sin(a) * Math.sin(az),
                (angle < 0 ? -1 : 1) * Math.cos(a),
              ],
        d,
      };
    }),
  );
  const solid = buildPolyhedron(planes);
  const minZ = Math.min(...solid.vertices.map((v) => v[2]));
  const maxZ = Math.max(...solid.vertices.map((v) => v[2]));
  const girdleVertices = [
    ...new Set(solid.facets.filter((f) => f.region === 'girdle').flatMap((f) => f.indices)),
  ].map((i) => solid.vertices[i]);
  const radius = Math.max(...girdleVertices.map((v) => Math.hypot(v[0], v[1])));
  const table = solid.facets.find((f) => f.family === 'table');
  const tableVertices = table.indices.map((i) => solid.vertices[i]);
  const diameter = (vs) =>
    Math.max(...vs.flatMap((a) => vs.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1]))));
  const width = diameter(girdleVertices);
  return {
    ...solid,
    parameters: { ...p },
    cutName: 'BL-M5',
    topologyVersion: 'bl-m5-flat-table-1',
    symmetry: 12,
    derived: {
      facetCount: solid.facets.length,
      opticalFacetCount: 61,
      totalDepth: (100 * (maxZ - minZ)) / width,
      tableWidth: (100 * diameter(tableVertices)) / width,
      diameter: width,
      girdleRadius: radius,
      minZ,
      maxZ,
    },
  };
}
export const blM5 = {
  id: 'bl-m5',
  name: 'BL-M5',
  version: 'bl-m5-flat-table-1',
  symmetry: 12,
  description:
    '85 Facetten · ASC-Geometrie mit Tafel auf exakt 0°. Winkel variabel; Ebenenabstände zunächst fixiert. Die Vorschau zeigt das Ausgangsdesign, Optimize Cut sucht Varianten.',
  parameters,
  defaults,
  precisionKeys: ['crown', 'pavilion', 'crown2'],
  generate,
};
