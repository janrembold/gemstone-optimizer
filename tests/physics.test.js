import test from 'node:test';
import assert from 'node:assert/strict';
import { fresnel, refract, reflect, criticalAngle } from '../js/optics/fresnel.js';
import { rad, dot, norm, intersectPlanes } from '../js/geometry/planes.js';
import { raySolid } from '../js/geometry/intersections.js';
import { buildPolyhedron } from '../js/geometry/meshBuilder.js';
import { traceRay, census, observerCensus } from '../js/optics/rayTracer.js';
import { refractiveIndex } from '../js/optics/dispersion.js';
import { materialModel } from '../js/materials.js';
const near = (a, b, e = 1e-10) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
test('Snell: air to n=1.5 at 30°, analytic 19.4712206345°', () => {
  const t = refract([0.5, 0, -Math.sqrt(0.75)], [0, 0, 1], 1, 1.5);
  near((Math.asin(t[0]) * 180) / Math.PI, 19.47122063449069);
  near(norm(t), 1);
});
test('Snell reversibility at oblique interface', () => {
  const d = [Math.sin(0.6), 0, -Math.cos(0.6)],
    t = refract(d, [0, 0, 1], 1, 2.417),
    back = refract(
      t.map((x) => -x),
      [0, 0, -1],
      2.417,
      1,
    );
  for (let i = 0; i < 3; i++) near(back[i], -d[i]);
});
test('Critical angle and both sides of TIR threshold', () => {
  const critical = criticalAngle(2.417);
  near(critical, Math.asin(1 / 2.417));
  assert.equal(fresnel(Math.cos(critical + 1e-8), 2.417, 1).tir, true);
  assert.equal(fresnel(Math.cos(critical - 1e-8), 2.417, 1).tir, false);
  assert.equal(refract([Math.sin(rad(50)), 0, Math.cos(rad(50))], [0, 0, -1], 1.5, 1), null);
});
test('Fresnel at normal incidence, Brewster and grazing', () => {
  near(fresnel(1, 1, 1.5).R, 0.04);
  const angle = Math.atan(1.5);
  const expected =
    0.5 *
    ((Math.cos(angle) - 1.5 * Math.cos(Math.PI / 2 - angle)) /
      (Math.cos(angle) + 1.5 * Math.cos(Math.PI / 2 - angle))) **
      2;
  near(fresnel(Math.cos(angle), 1, 1.5).R, expected);
  near(fresnel(1e-10, 1, 1.5).R, 1, 1e-8);
  near(dot(reflect([0.6, 0, -0.8], [0, 0, 1]), [0, 0, 1]), 0.8);
});
test('Three planes meet at exact point; parallel determinant rejected', () => {
  const ps = [
    { n: [1, 0, 0], d: 2 },
    { n: [0, 1, 0], d: 3 },
    { n: [0, 0, 1], d: 4 },
  ];
  assert.deepEqual(intersectPlanes(...ps), [2, 3, 4]);
  assert.equal(intersectPlanes(ps[0], ps[0], ps[2]), null);
});
function slab() {
  return buildPolyhedron([
    { n: [0, 0, 1], d: 1, region: 'crown', family: 'top' },
    { n: [0, 0, -1], d: 1, region: 'pavilion', family: 'bottom' },
    ...[
      [-1, 0, 0],
      [1, 0, 0],
      [0, -1, 0],
      [0, 1, 0],
    ].map((n) => ({ n, d: 1, region: 'girdle', family: 'side' })),
  ]);
}
test('Exact slab intersection, misses, surface and parallel rays', () => {
  const s = slab();
  near(raySolid(s.packed, [0, 0, 2], [0, 0, -1]).enter, 1);
  assert.equal(raySolid(s.packed, [2, 0, 2], [0, 0, -1]), null);
  assert.equal(raySolid(s.packed, [0, 0, 1], [0, 0, 1]), null);
  assert.ok(raySolid(s.packed, [0, 0, 1], [0, 0, -1]));
});
test('Plane-parallel slab matches infinite Fresnel series and conserves energy', () => {
  const r = traceRay(slab(), [0, 0, 2], [0, 0, -1], 1.5, [0, 0, 1], {
    maxBounces: 128,
    energyCutoff: 1e-14,
  });
  const R = 0.04;
  near(r.surface, R);
  near(r.leak, (1 - R) / (1 + R), 1e-12);
  near(r.useful, ((1 - R) * R) / (1 + R), 1e-12);
  near(r.surface + r.leak + r.useful + r.crownOther + r.residual, 1);
});
test('Bounce protection accounts for remaining energy, never hides it', () => {
  const r = traceRay(slab(), [0, 0, 2], [0, 0, -1], 2.65, [0, 0, 1], { maxBounces: 1 });
  assert.ok(r.residual > 0);
  near(r.surface + r.leak + r.useful + r.crownOther + r.residual, 1);
});
test('Cauchy fit matches documented B–G dispersion and D anchor', () => {
  for (const id of ['diamond', 'moissanite', 'cz', 'sapphire', 'yag']) {
    const m = materialModel(id);
    near(refractiveIndex(m, 589.3), m.ri);
    near(refractiveIndex(m, 430.8) - refractiveIndex(m, 686.7), m.dispersion);
    assert.ok(refractiveIndex(m, 450) > refractiveIndex(m, 650));
  }
});
test('SCHOTT Sellmeier reproduces published visible refractive indices', () => {
  const m = materialModel('glass');
  near(refractiveIndex(m, 587.6), 1.5168, 1e-5);
  near(refractiveIndex(m, 486.1), 1.52238, 1e-5);
  near(refractiveIndex(m, 656.3), 1.51432, 1e-5);
});
test('Material overrides reject nonphysical input', () => {
  assert.throws(() => materialModel('diamond', 1));
  assert.throws(() => materialModel('diamond', NaN));
  assert.equal(materialModel('moissanite').ri, 2.65);
});

test('Custom has no default RI; Other keeps only the entered index, no inherited dispersion', () => {
  assert.throws(() => materialModel('custom'));
  assert.throws(() => materialModel('other'));
  const model = materialModel('other', 1.9);
  assert.equal(model.ri, 1.9);
  assert.equal(model.dispersion, null);
  assert.equal(model.sellmeier, undefined);
  assert.equal(model.anisotropic, null);
  assert.equal(refractiveIndex(model, 450), refractiveIndex(model, 650));
});

test('Reverse observer slab matches analytic reflected radiance, including surface reflection', () => {
  const r = observerCensus(slab(), { ri: 1.5 }, 128, 0, { energyCutoff: 1e-14, maxBounces: 128 });
  near(r.unobstructed, (100 * 2 * 0.04) / 1.04, 1e-10);
  near(r.headShadow, r.unobstructed);
  near(r.visible, 0);
  const open = observerCensus(slab(), { ri: 1.5 }, 128, 0, { headShadowAngle: 0 });
  near(open.headShadow, 0);
  near(open.visible, open.unobstructed);
});
