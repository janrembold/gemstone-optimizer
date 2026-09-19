import { EPS, dot, add, sub, scale, cross, unit, norm } from './planes.js';
// Intersection of convex half-spaces n·x <= d. Each surviving polygon is a semantic facet.
export function buildPolyhedron(planes) {
  const vertices = [],
    facets = [];
  for (let pi = 0; pi < planes.length; pi++) {
    const p = planes[pi],
      u = unit(cross(Math.abs(p.n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], p.n)),
      v = cross(p.n, u),
      center = scale(p.n, p.d);
    const extent = 16;
    let poly = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([x, y]) => add(center, add(scale(u, x * extent), scale(v, y * extent))));
    for (let j = 0; j < planes.length && poly.length; j++) {
      if (j === pi) continue;
      const q = planes[j],
        next = [];
      for (let k = 0; k < poly.length; k++) {
        const a = poly[k],
          b = poly[(k + 1) % poly.length],
          da = dot(q.n, a) - q.d,
          db = dot(q.n, b) - q.d;
        if (da <= EPS) next.push(a);
        if (da > EPS !== db > EPS) next.push(add(a, scale(sub(b, a), da / (da - db))));
      }
      poly = next;
    }
    const ids = [];
    for (const pt of poly) {
      let id = vertices.findIndex((v) => norm(sub(v, pt)) < 1e-7);
      if (id < 0) {
        id = vertices.length;
        vertices.push(pt);
      }
      if (!ids.includes(id)) ids.push(id);
    }
    if (ids.length < 3) throw new Error(`Inactive/degenerate facet: ${p.family}`);
    let area = 0;
    for (let i = 1; i < ids.length - 1; i++)
      area +=
        norm(
          cross(
            sub(vertices[ids[i]], vertices[ids[0]]),
            sub(vertices[ids[i + 1]], vertices[ids[0]]),
          ),
        ) / 2;
    if (area < 1e-9) throw new Error(`Zero area: ${p.family}`);
    facets.push({ ...p, indices: ids, area });
  }
  const solid = { vertices, facets };
  validateSolid(solid);
  // Structure of arrays is shared by ray tracing and can be re-created after worker transport.
  solid.packed = new Float64Array(facets.flatMap((f) => [...f.n, f.d]));
  return solid;
}
export function validateSolid({ vertices, facets }) {
  const edges = new Map();
  let volume = 0;
  for (const f of facets) {
    for (const v of vertices) if (dot(f.n, v) > f.d + 1e-7) throw new Error('Nonconvex solid');
    for (let i = 0; i < f.indices.length; i++) {
      const a = f.indices[i],
        b = f.indices[(i + 1) % f.indices.length],
        key = [Math.min(a, b), Math.max(a, b)].join(':');
      const e = edges.get(key) || [0, 0];
      e[0]++;
      e[1] += a < b ? 1 : -1;
      edges.set(key, e);
      if (Math.abs(dot(f.n, vertices[a]) - f.d) > 1e-7) throw new Error('Nonplanar facet');
    }
    for (let i = 1; i < f.indices.length - 1; i++) {
      const a = vertices[f.indices[0]],
        b = vertices[f.indices[i]],
        c = vertices[f.indices[i + 1]];
      if (dot(cross(sub(b, a), sub(c, a)), f.n) < -EPS) throw new Error('Inverted winding');
      volume += dot(a, cross(b, c)) / 6;
    }
  }
  if ([...edges.values()].some(([n, w]) => n !== 2 || w !== 0))
    throw new Error('Open/nonmanifold geometry');
  if (vertices.length - edges.size + facets.length !== 2 || volume <= EPS)
    throw new Error('Invalid solid topology');
  return { volume, edges: edges.size, euler: 2 };
}
