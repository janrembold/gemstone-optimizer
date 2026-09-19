export const EPS = 1e-9;
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const add = (a, b) => a.map((x, i) => x + b[i]);
export const sub = (a, b) => a.map((x, i) => x - b[i]);
export const scale = (a, s) => a.map((x) => x * s);
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm = (a) => Math.hypot(...a);
export const unit = (a) => {
  const n = norm(a);
  if (n < EPS) throw new Error('Degenerate vector');
  return scale(a, 1 / n);
};
export const rad = (a) => (a * Math.PI) / 180;
export const deg = (a) => (a * 180) / Math.PI;
export function planeThrough(a, b, c, family) {
  let n = unit(cross(sub(b, a), sub(c, a))),
    d = dot(n, a);
  if (d < 0) {
    n = scale(n, -1);
    d = -d;
  }
  return { n, d, family };
}
export function intersectPlanes(a, b, c) {
  const bc = cross(b.n, c.n),
    det = dot(a.n, bc);
  if (Math.abs(det) < EPS) return null;
  return scale(
    add(add(scale(bc, a.d), scale(cross(c.n, a.n), b.d)), scale(cross(a.n, b.n), c.d)),
    1 / det,
  );
}
