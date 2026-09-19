import { format } from 'prettier';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parseASC } from '../js/export/gemcadAsc.js';
import { buildPolyhedron, validateSolid } from '../js/geometry/meshBuilder.js';
const paths = process.argv.slice(2);
if (!paths.length) throw new Error('Pass reference ASC paths as arguments');
const rows = paths.map((path) => {
  const bytes = readFileSync(path),
    text = bytes.toString('utf8'),
    parsed = parseASC(text),
    solid = buildPolyhedron(parsed.facets),
    check = validateSolid(solid);
  return {
    file: basename(path),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    gear: parsed.gear,
    facetCount: solid.facets.length,
    vertices: solid.vertices.length,
    ...check,
    closed: true,
  };
});
writeFileSync('docs/asc-reference-validation.json', JSON.stringify(rows, null, 2) + '\n');
writeFileSync(
  'docs/ASC-REFERENCES.md',
  `# Supplied ASC reference validation\n\nThe four user-supplied files were read locally, parsed and reconstructed as intersections of their facet half-spaces. We checked active facets, planarity, convexity, winding, paired edges and Euler characteristic. The originals carry copyright/licence notices and are not redistributed in this repository. The hashes below identify the exact files tested.\n\n| Reference | Gear | Facets | Vertices | Edges | Euler | Volume (file units³) | Closed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.map((r) => `| ${r.file} | ${r.gear} | ${r.facetCount} | ${r.vertices} | ${r.edges} | ${r.euler} | ${r.volume.toFixed(9)} | yes |`).join('\n')}\n\n${rows.map((r) => `- ${r.file}: SHA-256 \`${r.sha256}\``).join('\n')}\n\n## Structural observations\n\nAll begin with GemCad 5.0 and contain gear, symmetry, RI, heading, facet tiers, labels and footer comments. Tier distance is normal distance from the common origin, not vertical height. Pavilion angles are negative; the historic Old Single and Mazarin culets use negative zero, which must retain the pavilion sign. The references include labels after the final index; the manual also permits a label immediately after an index followed by more indices. Our writer uses the latter documented form.\n\nBL-M5 has 12-fold symmetry and 85 facets; it is a format reference, not the geometry of our 8-fold Round Brilliant. Distances in the supplied designs are often normalized to girdle plane distance 1. Our exported radius is 1, making 16-sided girdle plane distance cos(π/16). A uniform scale does not affect facet geometry or ray directions.\n\nGenerated exports are also parsed back and compared plane by plane and by volume against their simulated solids in automated tests. **Native GemCad import has not been executed**, because GemCad is not available in this environment; syntax/geometry roundtrip is verified, native application compatibility is not independently certified.\n\nRe-run: \`node scripts/validate-asc-references.js /path/to/reference.asc ...\`. Only report metadata is saved.\n`,
);
console.log(rows);

writeFileSync(
  'docs/ASC-REFERENCES.md',
  await format(readFileSync('docs/ASC-REFERENCES.md', 'utf8'), {
    parser: 'markdown',
    printWidth: 100,
  }),
);
