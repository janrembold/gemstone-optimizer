// Convex slab intersection. Also handles parallel and surface-origin rays.
export function raySolid(packed, o, d, stats = null) {
  let enter = -Infinity,
    exit = Infinity,
    entryFacet = -1,
    exitFacet = -1;
  for (let i = 0; i < packed.length; i += 4) {
    if (stats) stats.planeTests++;
    const den = packed[i] * d[0] + packed[i + 1] * d[1] + packed[i + 2] * d[2];
    const dist = packed[i + 3] - packed[i] * o[0] - packed[i + 1] * o[1] - packed[i + 2] * o[2];
    if (Math.abs(den) < 1e-12) {
      if (dist < -1e-9) return null;
      continue;
    }
    const t = dist / den;
    if (den < 0) {
      if (t > enter) {
        enter = t;
        entryFacet = i / 4;
      }
    } else if (t < exit) {
      exit = t;
      exitFacet = i / 4;
    }
    if (enter > exit + 1e-9) return null;
  }
  if (exit < 1e-10) return null;
  return { enter, exit, entryFacet, exitFacet };
}
// Inside convex stone: only outward-facing planes can be the next boundary.
export function nextBoundary(packed, x, y, z, dx, dy, dz) {
  let distance = Infinity,
    facet = -1;
  for (let i = 0; i < packed.length; i += 4) {
    const q = packed[i] * dx + packed[i + 1] * dy + packed[i + 2] * dz;
    if (q <= 1e-12) continue;
    const t = (packed[i + 3] - packed[i] * x - packed[i + 1] * y - packed[i + 2] * z) / q;
    if (t > 1e-10 && t < distance) {
      distance = t;
      facet = i / 4;
    }
  }
  return { distance, facet };
}
