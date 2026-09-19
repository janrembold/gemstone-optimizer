import { dot, scale, add, unit } from '../geometry/planes.js';
export function fresnel(cosI, n1, n2) {
  const c = Math.max(0, Math.min(1, cosI)),
    eta = n1 / n2,
    s2 = eta * eta * (1 - c * c);
  if (s2 >= 1) return { R: 1, cosT: 0, tir: true };
  const t = Math.sqrt(1 - s2);
  const rs = (n1 * c - n2 * t) / (n1 * c + n2 * t),
    rp = (n2 * c - n1 * t) / (n2 * c + n1 * t);
  return { R: (rs * rs + rp * rp) / 2, cosT: t, tir: false };
}
// normal points into the incident medium; direction points towards the interface.
export function refract(direction, normal, n1, n2) {
  const c = -dot(direction, normal),
    f = fresnel(c, n1, n2);
  return f.tir ? null : unit(add(scale(direction, n1 / n2), scale(normal, (n1 / n2) * c - f.cosT)));
}
export const reflect = (direction, normal) =>
  add(direction, scale(normal, -2 * dot(direction, normal)));
export const criticalAngle = (n1, n2 = 1) => (n1 > n2 ? Math.asin(n2 / n1) : null);
