import { fittedPlanes } from './leonardoFit.js';
import { generate as imageReference } from './leonardo.js';
import { indexedOpticalPlanes, finishIndexed, validateGear } from '../geometry/integerIndex.js';
import { indexedPavilionGirdle } from '../geometry/indexedPavilionGirdle.js';

export const topologyVersion = 'leo-jr-three-tier-3';
export const defaults = {
  crownScale: 100,
  pavilionBase: 40.4,
  pavilionMiddle: 40.15,
  pavilionTip: 37.9,
  separation: 7,
};
export const parameters = [
  { key: 'crownScale', label: 'Kronenhöhe / Bildfit (%)', min: 98, max: 102, coarse: 2, fine: 0.5 },
  {
    key: 'pavilionBase',
    label: 'P1 · 20 Basisfacetten (°)',
    min: 40.2,
    max: 40.6,
    coarse: 0.2,
    fine: 0.05,
  },
  {
    key: 'pavilionMiddle',
    label: 'P2 · 10 Zwischenfacetten (°)',
    min: 39.95,
    max: 40.15,
    coarse: 0.1,
    fine: 0.05,
  },
  {
    key: 'pavilionTip',
    label: 'P3 · 5 Spitzenfacetten (°)',
    min: 37.7,
    max: 38.1,
    coarse: 0.2,
    fine: 0.05,
  },
  {
    key: 'separation',
    label: 'Kronen-/Pavillon-Abstand (% Bezugsradius)',
    min: 7,
    max: 8,
    coarse: 1,
    fine: 0.25,
  },
];
// Recover radial tier crossings from the previous continuous image fit, then
// average the two fivefold counterparts. These inherit the fit uncertainty.
function referenceCrossing(innerFamily, outerFamily) {
  const inner = fittedPlanes.find((f) => f.family === innerFamily);
  const radius = Math.hypot(inner.n[0], inner.n[1]);
  const direction = inner.n.slice(0, 2).map((x) => x / radius);
  const alignment = (f) =>
    (f.n[0] * direction[0] + f.n[1] * direction[1]) / Math.hypot(f.n[0], f.n[1]);
  const outer = fittedPlanes
    .filter((f) => f.family === outerFamily)
    .sort((a, b) => alignment(b) - alignment(a))[0];
  const slope = (f) => -(f.n[0] * direction[0] + f.n[1] * direction[1]) / f.n[2];
  return (inner.d / inner.n[2] - outer.d / outer.n[2]) / (slope(outer) - slope(inner));
}
export const tierCrossings = {
  baseToMiddle:
    (referenceCrossing('pavilion3', 'pavilion2') + referenceCrossing('pavilion5', 'pavilion4')) / 2,
  middleToTip:
    (referenceCrossing('pavilion6', 'pavilion3') + referenceCrossing('pavilion6', 'pavilion5')) / 2,
};
export function generate(p = defaults, gear = 80) {
  validateGear(gear, 5);
  for (const key of Object.keys(defaults))
    if (!Number.isFinite(p[key])) throw new Error(`Invalid ${key}`);
  if (
    p.pavilionBase - p.pavilionMiddle < 0.01 - 1e-10 ||
    p.pavilionMiddle - p.pavilionTip < 0.01 - 1e-10 ||
    p.pavilionTip < 25 ||
    p.pavilionBase > 60
  )
    throw new Error('Pavillon benötigt genau drei geordnete Winkel: P1 > P2 > P3 (25–60°).');
  // Only the crown is inherited from the image fit. No fitted pavilion plane
  // is carried into the final stone, and no per-facet azimuth fitting follows.
  const reference = imageReference({
    crownScale: p.crownScale,
    pavilionScale: 100,
    separation: p.separation,
  });
  const crown = indexedOpticalPlanes(
    { ...reference, facets: reference.facets.filter((f) => f.region === 'crown') },
    gear,
  );
  const radians = (a) => (a * Math.PI) / 180;
  const b = Math.tan(radians(p.pavilionBase)),
    m = Math.tan(radians(p.pavilionMiddle)),
    t = Math.tan(radians(p.pavilionTip));
  const z0 = -p.separation / 200;
  const baseDepth = b - z0;
  const middleDepth = baseDepth - (b - m) * tierCrossings.baseToMiddle;
  const tipDepth = middleDepth - (m * Math.cos(Math.PI / 20) - t) * tierCrossings.middleToTip;
  const tiers = [
    ['pavilionBase', p.pavilionBase, baseDepth, Array.from({ length: 20 }, (_, i) => i * 4)],
    [
      'pavilionMiddle',
      p.pavilionMiddle,
      middleDepth,
      Array.from({ length: 5 }, (_, i) => [8 + i * 16, 12 + i * 16]).flat(),
    ],
    ['pavilionTip', p.pavilionTip, tipDepth, Array.from({ length: 5 }, (_, i) => 10 + i * 16)],
  ];
  const pavilion = tiers.flatMap(([family, angle, depth, indices80]) => {
    const sin = Math.sin(radians(angle)),
      cos = Math.cos(radians(angle));
    return indices80.map((index80) => {
      const index = (index80 * gear) / 80,
        azimuth = (index * 2 * Math.PI) / gear;
      if (!Number.isInteger(index))
        throw new Error('Indexrad unterstützt die feste Pavillonstruktur nicht.');
      return {
        family,
        region: 'pavilion',
        n: [sin * Math.cos(azimuth), sin * Math.sin(azimuth), -cos],
        d: depth * cos,
      };
    });
  });
  const girdle = indexedPavilionGirdle(pavilion, gear, 5, z0);
  const stone = finishIndexed(
    {
      ...reference,
      parameters: { ...p },
      cutName: 'Leo JR Edition',
      topologyVersion,
      derived: {
        ...reference.derived,
        pavilionAngles: [p.pavilionBase, p.pavilionMiddle, p.pavilionTip],
      },
    },
    [...crown, ...pavilion, ...girdle],
    gear,
  );
  const counts = ['pavilionBase', 'pavilionMiddle', 'pavilionTip'].map(
    (name) => stone.facets.filter((f) => f.family === name).length,
  );
  if (counts.join(',') !== '20,10,5' || stone.facets.length !== 76)
    throw new Error('Ungültige 20/10/5-Pavillontopologie.');
  for (const f of stone.facets.filter((f) => f.region === 'girdle')) {
    const owner = pavilion[f.pavilionOwner];
    const shared = f.indices.filter(
      (i) =>
        Math.abs(owner.n.reduce((s, n, j) => s + n * stone.vertices[i][j], 0) - owner.d) < 1e-8,
    );
    const bottom = f.indices.filter((i) =>
      pavilion.some(
        (q) => Math.abs(q.n.reduce((sum, n, j) => sum + n * stone.vertices[i][j], 0) - q.d) < 1e-8,
      ),
    );
    if (
      shared.length !== 2 ||
      bottom.length !== 2 ||
      !shared.every((i) => Math.abs(stone.vertices[i][2] - z0) < 1e-8)
    )
      throw new Error('Rundiste stimmt nicht mit ihrer Basisfacette überein.');
  }
  stone.derived.girdleFacetCount = 20;
  stone.derived.pavilionTierCounts = counts;
  return stone;
}
export const leoJR = {
  id: 'leo-jr',
  name: 'Leo JR Edition',
  version: topologyVersion,
  symmetry: 5,
  defaultGear: 80,
  nativeIntegerGeometry: true,
  description:
    'Drei feste Pavillon-Winkelgruppen: 20 gleichmäßig verteilte Basis-, 10 Zwischen- und 5 Spitzenfacetten. Genau 20 Rundistenfacetten mit denselben Indizes wie die Basis. Alle Indexpositionen ganzzahlig; Neigungen sind rekonstruierte Startwerte.',
  parameters,
  defaults,
  precisionKeys: ['pavilionBase', 'pavilionMiddle', 'pavilionTip'],
  precisionLabel: 'Drei Pavillonwinkel · 0.01°',
  generate,
};
