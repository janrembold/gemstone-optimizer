import { buildPolyhedron } from '../geometry/meshBuilder.js';
import { fittedPlanes } from './leonardoFit.js';
import { deg } from '../geometry/planes.js';
export const defaults = { crownScale: 100, pavilionScale: 100, separation: 4 };
export const parameters = [
  { key: 'crownScale', label: 'Kronenhöhe / Fit (%)', min: 98, max: 102, coarse: 2, fine: 0.5 },
  {
    key: 'pavilionScale',
    label: 'Pavillontiefe / Fit (%)',
    min: 98,
    max: 102,
    coarse: 2,
    fine: 0.5,
  },
  {
    key: 'separation',
    label: 'Kronen-/Pavillon-Abstand (% Bezugsradius)',
    min: 4,
    max: 5,
    coarse: 1,
    fine: 0.25,
  },
];
export function generate(p = defaults) {
  return generateFitted(p);
}
export function generateFitted(p, girdleFactory, metadata = {}) {
  for (const key of Object.keys(defaults))
    if (!Number.isFinite(p[key])) throw new Error(`Invalid ${key}`);
  if (
    p.crownScale < 85 ||
    p.crownScale > 115 ||
    p.pavilionScale < 85 ||
    p.pavilionScale > 115 ||
    p.separation < 3 ||
    p.separation > 10
  )
    throw new Error('Outside supported image-fit neighborhood');
  const planes = fittedPlanes.map((f) => {
    const scale = (f.region === 'crown' ? p.crownScale : p.pavilionScale) / 100;
    const shift = ((f.region === 'crown' ? 1 : -1) * p.separation) / 200;
    // Scale height about the original fitted reference plane, then translate.
    const n = [f.n[0], f.n[1], f.n[2] / scale],
      length = Math.hypot(...n);
    return { ...f, n: n.map((x) => x / length), d: (f.d + n[2] * shift) / length };
  });
  if (girdleFactory) planes.push(...girdleFactory(planes.filter((f) => f.region === 'pavilion')));
  else {
    // Original Leonardo approximation retained for reproducibility.
    for (let i = 0; i < 80; i++)
      planes.push({
        family: 'girdle',
        region: 'girdle',
        n: [Math.cos((i * Math.PI) / 40), Math.sin((i * Math.PI) / 40), 0],
        d: 0.98,
      });
  }
  const solid = buildPolyhedron(planes);
  const radius = Math.max(...solid.vertices.map((v) => Math.hypot(v[0], v[1]))),
    diameter = 2 * radius;
  const table = solid.facets.find((f) => f.n[2] === 1);
  if (!table) throw new Error('Horizontal table missing');
  const tableVertices = table.indices.map((i) => solid.vertices[i]);
  const tableWidth = Math.max(
    ...tableVertices.flatMap((a) => tableVertices.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1]))),
  );
  const crown = planes.filter((f) => f.region === 'crown'),
    pavilion = planes.filter((f) => f.region === 'pavilion');
  const angles = (fs) => [
    ...new Map(
      fs
        .filter((f) => Math.abs(f.n[2]) < 1)
        .map((f) => [f.family, deg(Math.acos(Math.abs(f.n[2])))]),
    ).values(),
  ];
  const girdleVertices = solid.facets
    .filter((f) => f.region === 'girdle')
    .flatMap((f) => f.indices.map((i) => solid.vertices[i]));
  const thickness = girdleVertices.map(([x, y]) => {
    const top = Math.min(...crown.map((f) => (f.d - f.n[0] * x - f.n[1] * y) / f.n[2]));
    const bottom = Math.max(...pavilion.map((f) => (f.d - f.n[0] * x - f.n[1] * y) / f.n[2]));
    return (100 * (top - bottom)) / diameter;
  });
  if (Math.min(...thickness) <= 0) throw new Error('Rim closes: increase separation');
  return {
    ...solid,
    parameters: { ...p },
    cutName: 'Leonardo',
    topologyVersion: 'leonardo-image-fit-1',
    symmetry: 5,
    symmetryMirror: false,
    approximation: true,
    ...metadata,
    derived: {
      facetCount: solid.facets.length,
      opticalFacetCount: 56,
      tableWidth: (100 * tableWidth) / diameter,
      totalDepth:
        (100 *
          (Math.max(...solid.vertices.map((v) => v[2])) -
            Math.min(...solid.vertices.map((v) => v[2])))) /
        diameter,
      crownAngles: angles(crown),
      pavilionAngles: angles(pavilion),
      girdleMin: Math.min(...thickness),
      girdleMax: Math.max(...thickness),
      approximation: true,
    },
  };
}
export const leonardo = {
  id: 'leonardo',
  name: 'Leonardo',
  version: 'leonardo-image-fit-1',
  symmetry: 5,
  defaultGear: 80,
  description:
    'Bildentwurf: 21 Kronen- und 35 Pavillonfacetten aus Linien-Fit; 80 konstruierte Rundistenfacetten. Winkel sind geschätzt, keine bestätigten Original-Schnittdaten. Rundistendicke variiert mit den Meetpoints.',
  parameters,
  defaults,
  precisionKeys: ['crownScale', 'pavilionScale'],
  precisionLabel: 'Höhenskalierung · 0.01 Prozentpunkte',
  generate,
};
