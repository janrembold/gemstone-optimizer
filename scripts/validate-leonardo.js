import { writeFileSync } from 'node:fs';
import { generate, defaults } from '../js/cuts/leonardo.js';
import { validateSolid } from '../js/geometry/meshBuilder.js';
import { evaluate } from '../js/optics/metrics.js';
import { exportASC } from '../js/export/gemcadAsc.js';
import { materialModel } from '../js/materials.js';
const stone = generate();
const metrics = evaluate(stone, materialModel('moissanite'), {
  faceRays: 3200,
  tiltRays: 2200,
  spectralRays: 800,
  fullTilt: true,
});
writeFileSync(
  'docs/leonardo-reference-results.json',
  JSON.stringify(
    {
      model: 'leonardo-image-fit-1',
      approximation: true,
      material: materialModel('moissanite'),
      parameters: defaults,
      geometry: { ...validateSolid(stone), ...stone.derived },
      metrics,
    },
    null,
    2,
  ) + '\n',
);
writeFileSync('docs/Leonardo-image-fit.asc', exportASC(stone, materialModel('moissanite'), 80));
// Scientific vector projection of the constructed solid; no image generation or altered source image.
let svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450"><rect width="1200" height="450" fill="white"/><text x="20" y="28" font-family="sans-serif" font-size="18">Leonardo · IMAGE-FIT / constructed girdle · not original cutting data</text>';
for (const [col, region, label] of [
  [0, 'crown', 'Crown: 21'],
  [1, 'side', 'Profile: constructed girdle'],
  [2, 'pavilion', 'Pavilion: 35'],
]) {
  svg += `<text x="${col * 400 + 20}" y="60" font-family="sans-serif" font-size="16">${label}</text>`;
  for (const f of stone.facets.filter((f) => region === 'side' || f.region === region)) {
    const points = f.indices
      .map((i) => {
        const v = stone.vertices[i];
        return `${col * 400 + 200 + v[0] * 175},${region === 'side' ? 185 - v[2] * 175 : 250 - v[1] * 175}`;
      })
      .join(' ');
    svg += `<polygon points="${points}" fill="none" stroke="${f.region === 'girdle' ? '#aaa' : '#8c814f'}" stroke-width="1"/>`;
  }
}
svg += '</svg>';
writeFileSync('docs/Leonardo-projections.svg', svg);
console.log(
  JSON.stringify(
    { geometry: stone.derived, Global: metrics.Global, HeadShadow: metrics.HeadShadow },
    null,
    2,
  ),
);
