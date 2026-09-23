import test from 'node:test';
import assert from 'node:assert/strict';
import { getCut } from '../js/cuts/cutDefinition.js';
const round = () => getCut('round-brilliant').generate();
import { generate as blM5 } from '../js/cuts/blM5.js';
import { buildPolyhedron, validateSolid } from '../js/geometry/meshBuilder.js';
import { norm, sub } from '../js/geometry/planes.js';
import { exportASC, parseASC } from '../js/export/gemcadAsc.js';
import { materialModel } from '../js/materials.js';
const material = materialModel('moissanite');
// Read raw records separately from the app parser so its own assumptions cannot
// conceal duplicate first indices or accidentally emitted G comment tails.
function inspect(text, gear) {
  const lines = text.trim().split(/\r?\n/);
  assert.equal(lines[0], 'GemCad 5.0');
  assert.ok(lines.filter((l) => l.startsWith('H ')).length <= 4);
  assert.ok(lines.filter((l) => l.startsWith('F ')).length <= 4);
  const tiers = [];
  for (const line of lines) {
    assert.match(line, /^(GemCad 5\.0|[gyIHaF] )/);
    if (!line.startsWith('a ')) continue;
    const t = line.split(/\s+/);
    assert.equal(t[4], 'n');
    assert.ok(t[5]); // Facet name: G and numeric names are valid here.
    const indexTokens = [t[3], ...t.slice(6)];
    assert.ok(indexTokens.every((x) => Number.isFinite(Number(x))));
    const indices = indexTokens.map((x) => Number(x) % gear);
    assert.equal(
      new Set(indices).size,
      indices.length,
      'Duplicate index, including first/wraparound',
    );
    tiers.push({ angle: Number(t[1]), distance: Number(t[2]), indices });
  }
  return tiers;
}
test('ASC compatibility: full indices once, one line per tier, no G comments, correct symmetry', () => {
  for (const stone of [round(), blM5()]) {
    const text = exportASC(stone, material),
      tiers = inspect(text, 96);
    assert.ok(
      text.includes(`y ${stone.symmetry} ${stone.symmetryMirror === false ? 'n' : 'y'}\r\n`),
    );
    assert.equal(
      tiers.reduce((n, t) => n + t.indices.length, 0),
      stone.facets.length,
    );
    const reconstructed = buildPolyhedron(parseASC(text).facets);
    assert.ok(Math.abs(validateSolid(stone).volume - validateSolid(reconstructed).volume) < 1e-9);
    for (const f of stone.facets)
      assert.ok(
        reconstructed.facets.some((g) => norm(sub(f.n, g.n)) < 1e-9 && Math.abs(f.d - g.d) < 1e-9),
      );
  }
  const table = inspect(exportASC(blM5(), material), 96).find((t) => t.angle === 0);
  assert.equal(table.angle, 0);
  assert.equal(table.distance, 0.30757899);
  assert.equal(table.indices.length, 1);
});
test('ASC names G and numeric names are labels; instruction tails are never facet indices', () => {
  const text =
    'GemCad 5.0\ng 96 0.0\ny 8 y\na -90 1 3 n G 9 15 G 500 should not be an index\nG 800 is a comment\na 34.499916 .60691103 96 n 2 12 24';
  const parsed = parseASC(text);
  assert.equal(parsed.facets.length, 6);
  assert.deepEqual(
    parsed.facets.map((f) => f.index),
    [3, 9, 15, 96, 12, 24],
  );
  const stone = round();
  const renamed = {
    ...stone,
    facets: stone.facets.map((f) => ({ ...f, family: f.family === 'girdle' ? 'G' : f.family })),
  };
  assert.ok(exportASC(renamed, material).includes(' n G '));
  inspect(exportASC(renamed, material), 96);
});
test('ASC export preserves close distinct distances instead of grouping at eight decimals', () => {
  const stone = {
    symmetry: 2,
    facets: [
      { n: [1, 0, 0], d: 1.000000001, family: 'girdle' },
      { n: [-1, 0, 0], d: 1.000000004, family: 'girdle' },
    ],
  };
  const tiers = inspect(exportASC(stone, material), 96);
  assert.equal(tiers.length, 2);
  assert.deepEqual(
    tiers.map((t) => t.distance),
    [1.000000001, 1.000000004],
  );
});
test('ASC export rejects fractional indices instead of silently rounding or rescaling', () => {
  const source = round();
  const planes = source.facets.map((f) => {
    const n = [f.n[0] / 2, f.n[1], f.n[2]],
      length = norm(n);
    return { ...f, n: n.map((v) => v / length), d: f.d / length };
  });
  const oval = { ...buildPolyhedron(planes), symmetry: 2, cutName: 'Oval regression' };
  assert.throws(() => exportASC(oval, material, 64), /Gebrochener Index/);
});

test('ASC export retains the negative-zero sign of a horizontal pavilion culet', () => {
  const stone = {
    symmetry: 4,
    facets: [
      { family: 'table', n: [0, 0, 1], d: 0.3 },
      { family: 'culet', n: [0, 0, -1], d: 0.5 },
    ],
  };
  const text = exportASC(stone, material);
  assert.match(text, /a -0\.0000000000 0\.500000000000/);
  const parsed = parseASC(text);
  assert.equal(parsed.facets[0].n[2], 1);
  assert.equal(parsed.facets[1].n[2], -1);
});
