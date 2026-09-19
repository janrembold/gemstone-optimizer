export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical(value[k]))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export function configurationID(config) {
  let h = 2166136261;
  for (const c of canonical(config)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return 'GC-' + (h >>> 0).toString(16).padStart(8, '0');
}
