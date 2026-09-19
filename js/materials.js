const gia = 'https://www.gia.edu/doc/WN97.pdf';
export const materials = [
  {
    id: 'diamond',
    name: 'Diamant (Diamond)',
    ri: 2.417,
    dispersion: 0.044,
    anisotropic: false,
    source: gia,
  },
  {
    id: 'moissanite',
    name: 'Moissanite',
    ri: 2.65,
    dispersion: 0.104,
    anisotropic: true,
    source: 'https://www.gia.edu/gems-gemology/winter-1997-synthetic-moissanite-nassau0',
  },
  { id: 'cz', name: 'Cubic Zirconia', ri: 2.16, dispersion: 0.06, anisotropic: false, source: gia },
  {
    id: 'sapphire',
    name: 'Saphir / Korund',
    ri: 1.768,
    dispersion: 0.018,
    anisotropic: true,
    source: gia,
  },
  {
    id: 'spinel',
    name: 'Spinel (natural)',
    ri: 1.718,
    dispersion: null,
    anisotropic: false,
    source: 'https://www.gia.edu/doc/WN88.pdf',
  },
  {
    id: 'quartz',
    name: 'Quartz',
    ri: 1.544,
    dispersion: null,
    anisotropic: true,
    source: 'https://www.gia.edu/rose-quartz',
  },
  {
    id: 'topaz',
    name: 'Topaz',
    ri: 1.619,
    dispersion: null,
    anisotropic: true,
    source: 'https://www.gia.edu/doc/Pink-Topaz-from-Pakistan.pdf',
  },
  { id: 'yag', name: 'YAG', ri: 1.833, dispersion: 0.028, anisotropic: false, source: gia },
  {
    id: 'glass',
    name: 'Glas (N-BK7)',
    ri: 1.5168,
    dispersion: null,
    anisotropic: false,
    sellmeier: {
      B: [1.03961212, 0.231792344, 1.01046945],
      C: [0.00600069867, 0.0200179144, 103.560653],
    },
    source: 'https://www.schott.com/en-us/products/optical-glass-p1000267',
  },
  { id: 'custom', name: 'Custom', ri: null, dispersion: null, anisotropic: null, source: null },
  { id: 'other', name: 'Other', ri: null, dispersion: null, anisotropic: null, source: null },
];
export function materialModel(id, ri) {
  const m = materials.find((m) => m.id === id);
  if (!m) throw new Error('Unknown material');
  const n = ri ?? m.ri;
  if (!Number.isFinite(n) || n <= 1 || n > 4) throw new Error('RI must be > 1 and ≤ 4');
  return { ...m, ri: n, customRI: m.ri == null || Math.abs(n - m.ri) > 1e-8, referenceRI: m.ri };
}
