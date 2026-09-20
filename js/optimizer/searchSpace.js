export const presets = {
  fast: {
    label: 'Fast',
    coarseFactor: 2,
    regions: 5,
    passes: 1,
    faceRays: 64,
    tiltRays: 32,
    spectralRays: 32,
    finalists: 8,
  },
  balanced: {
    label: 'Balanced',
    coarseFactor: 1,
    regions: 8,
    passes: 2,
    faceRays: 192,
    tiltRays: 96,
    spectralRays: 96,
    finalists: 10,
  },
  exhaustive: {
    label: 'Exhaustive',
    coarseFactor: 0.5,
    regions: 10,
    passes: 3,
    faceRays: 384,
    tiltRays: 192,
    spectralRays: 192,
    finalists: 12,
  },
};
export function axis(min, max, step) {
  if (![min, max, step].every(Number.isFinite) || max < min || step <= 0)
    throw new Error('Invalid search range');
  if ((max - min) / step > 1000) throw new Error('Range contains more than 1,001 steps');
  const a = [];
  for (let i = 0; min + i * step < max - 1e-8; i++) a.push(Number((min + i * step).toFixed(8)));
  a.push(max);
  return a;
}
export function gridSize(ranges, factor = 1) {
  return ranges.reduce((n, r) => n * axis(r.min, r.max, r.coarse * factor).length, 1);
}
export function* grid(ranges, factor = 1, i = 0, p = {}) {
  if (i === ranges.length) {
    yield { ...p };
    return;
  }
  const r = ranges[i];
  for (const v of axis(r.min, r.max, r.coarse * factor))
    yield* grid(ranges, factor, i + 1, { ...p, [r.key]: v });
}
export function neighbors(center, ranges, precisionKeys = null) {
  const out = [];
  if (precisionKeys) {
    const walk = (i, p) => {
      if (i === precisionKeys.length) {
        if (ranges.every((r) => p[r.key] >= r.min - 1e-9 && p[r.key] <= r.max + 1e-9)) out.push(p);
        return;
      }
      const key = precisionKeys[i];
      for (let d = -2; d <= 2; d++)
        walk(i + 1, { ...p, [key]: Number((center[key] + d * 0.01).toFixed(8)) });
    };
    walk(0, { ...center });
  } else
    for (const r of ranges)
      for (const d of [-1, 1]) {
        const v = Number((center[r.key] + d * r.fine).toFixed(8));
        if (v >= r.min - 1e-9 && v <= r.max + 1e-9) out.push({ ...center, [r.key]: v });
      }
  return out;
}
export function diverse(candidates, ranges, count) {
  const sorted = [...candidates].sort(
      (a, b) => b.metrics.Global - a.metrics.Global || a.id.localeCompare(b.id),
    ),
    selected = [];
  for (const c of sorted) {
    if (
      selected.every(
        (s) =>
          Math.sqrt(
            ranges.reduce(
              (v, r) =>
                v + ((c.parameters[r.key] - s.parameters[r.key]) / (r.max - r.min || 1)) ** 2,
              0,
            ),
          ) > 0.16,
      )
    )
      selected.push(c);
    if (selected.length === count) return selected;
  }
  for (const c of sorted)
    if (!selected.includes(c)) {
      selected.push(c);
      if (selected.length === count) break;
    }
  return selected;
}

// Preserve numerical leaders even when they are geometrically close together.
export function selectFinalists(candidates, ranges, count) {
  const sorted = [...candidates].sort(
    (a, b) => b.metrics.Global - a.metrics.Global || a.id.localeCompare(b.id),
  );
  const selected = new Map();
  for (const candidate of [...sorted.slice(0, count), ...diverse(sorted, ranges, count)]) {
    selected.set(candidate.id, candidate);
  }
  return [...selected.values()];
}
