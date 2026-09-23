// Every outer basis facet defines one vertical girdle facet at the same integer
// index and common section height. Twenty evenly spaced basis facets -> twenty
// evenly spaced girdle facets; intermediate and tip tiers never define the rim.
export function indexedPavilionGirdle(pavilion, gear, symmetry, referenceHeight) {
  if (symmetry !== 5 || !Number.isFinite(referenceHeight))
    throw new Error('Leo JR benötigt fünfzählige Symmetrie und eine gültige Anschlusshöhe.');
  const girdle = pavilion.flatMap((f, pavilionOwner) => {
    if (f.family !== 'pavilionBase') return [];
    const radial = Math.hypot(f.n[0], f.n[1]);
    const n = [f.n[0] / radial, f.n[1] / radial, 0];
    const index = (Math.atan2(n[1], n[0]) * gear) / (2 * Math.PI);
    if (Math.abs(index - Math.round(index)) > 1e-7)
      throw new Error('Pavillonstütze hat keine ganzzahlige Indexposition.');
    // Intersection of the source pavilion plane with z = referenceHeight,
    // extruded vertically. Thus azimuth AND plane distance follow the pavilion.
    return [
      {
        n,
        d: (f.d - f.n[2] * referenceHeight) / radial,
        family: 'girdle',
        region: 'girdle',
        pavilionOwner,
        pavilionFamily: f.family,
        referenceHeight,
      },
    ];
  });
  if (girdle.length !== 20) throw new Error('Leo JR benötigt genau 20 Rundistenstützen.');
  return girdle;
}
