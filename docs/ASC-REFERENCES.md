# Supplied ASC reference validation

The four user-supplied files were read locally, parsed and reconstructed as intersections of their facet half-spaces. We checked active facets, planarity, convexity, winding, paired edges and Euler characteristic. The originals carry copyright/licence notices and are not redistributed in this repository. The hashes below identify the exact files tested.

| Reference      | Gear | Facets | Vertices | Edges | Euler | Volume (file units³) | Closed |
| -------------- | ---- | ------ | -------- | ----- | ----- | -------------------- | ------ |
| Old Single.asc | 96   | 26     | 32       | 56    | 2     | 2.212752175          | yes    |
| Mazarin.asc    | 96   | 42     | 80       | 120   | 2     | 2.186893114          | yes    |
| BL-Anteros.asc | 96   | 73     | 121      | 192   | 2     | 1.700793841          | yes    |
| BL-M5.asc      | 96   | 85     | 85       | 168   | 2     | 1.668353170          | yes    |

- Old Single.asc: SHA-256 `1ec3db278d08195e41ad2f5a7b554ffc022631450f5798137437109e65b1489f`
- Mazarin.asc: SHA-256 `3d9522a8601616233306e8da9bd5a8af66051d5fedce8efd01e570c302c72dd7`
- BL-Anteros.asc: SHA-256 `42b39558b877ae42753acb8cfd20df1e31a5b3cef23ee68344adf1fd32c55892`
- BL-M5.asc: SHA-256 `e337156e4ad20d41435cd01239f2927956675b966881bc7c3ee7064fa113e5fb`

## Structural observations

All begin with GemCad 5.0 and contain gear, symmetry, RI, heading, facet tiers, labels and footer comments. Tier distance is normal distance from the common origin, not vertical height. Pavilion angles are negative; the historic Old Single and Mazarin culets use negative zero, which must retain the pavilion sign. The references include labels after the final index; the manual also permits a label immediately after an index followed by more indices. Our writer uses the latter documented form.

The supplied BL-M5 has nominal 12-fold symmetry and 85 facets; its tiny tilted table prevents exact symmetry. It is now also a separate [BL-M5 cut family](BL-M5.md), with the table corrected to exactly 0° at the user’s request. It is not the geometry of our 8-fold Round Brilliant. Distances in the supplied designs are often normalized to girdle plane distance 1. Our exported radius is 1, making 16-sided girdle plane distance cos(π/16). A uniform scale does not affect facet geometry or ray directions.

Generated exports are also parsed back and compared plane by plane and by volume against their simulated solids in automated tests. **Native GemCad import has not been executed**, because GemCad is not available in this environment; syntax/geometry roundtrip is verified, native application compatibility is not independently certified.

Re-run: `node scripts/validate-asc-references.js /path/to/reference.asc ...`. Only report metadata is saved.

## Export audit against the ASC repair findings (2026-09-21)

The requested chat, **“ASC Fehler analysieren”**, explicitly corrected its earlier symmetry diagnosis. The user reported the repaired Round Brilliant imported successfully after standalone `G` instructions were removed while `y 8 y` and complete index lists were retained. Later repairs also joined multiline lists and preserved oval geometry. Those reports do not constitute a native import test of this application's exports.

The [official GemCad manual, p. 21](https://www.gemcad.com/downloads/gemcadman.pdf) independently confirms the full-index form with `y 8 y`, first-index semantics, `n` facet names, and `G` cutting instructions. Our writer already outputs no `G` instruction records/tails and writes one complete line per tier. Labels such as `n G` remain valid. BL-M5 uses its own `y 12 y`; no symmetry substitution or index expansion is applied.

The audit found two precision edge cases and corrected them: tier grouping now uses the same 10-decimal angle / 12-decimal distance precision as serialization instead of grouping distances at eight decimals, and horizontal pavilion culets retain their negative-zero angle sign. The latter does not change the point culets of the two current families. Genuine fractional angles and indices are not rounded to whole degrees or teeth.

`tests/asc-compatibility.test.js` checks raw emitted records independently of the app parser: first index occurs once, unique positions include wraparound, headers/footers are limited to four lines each, no continuation or instruction lines occur, and cut-specific symmetry is retained. It also checks numeric and `G` facet names, near-but-distinct plane distances, signed-zero culets and a synthetic oval with 64 gear / twofold symmetry whose vertices and volume survive roundtrip. The synthetic oval is a test fixture, not the unavailable latest oval attachment from the other chat. The parser remains a limited reconstruction tool, not a general multiline ASC repair utility; the writer does not emit multiline facet records.
