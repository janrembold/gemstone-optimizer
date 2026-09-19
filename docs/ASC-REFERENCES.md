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

BL-M5 has 12-fold symmetry and 85 facets; it is a format reference, not the geometry of our 8-fold Round Brilliant. Distances in the supplied designs are often normalized to girdle plane distance 1. Our exported radius is 1, making 16-sided girdle plane distance cos(π/16). A uniform scale does not affect facet geometry or ray directions.

Generated exports are also parsed back and compared plane by plane and by volume against their simulated solids in automated tests. **Native GemCad import has not been executed**, because GemCad is not available in this environment; syntax/geometry roundtrip is verified, native application compatibility is not independently certified.

Re-run: `node scripts/validate-asc-references.js /path/to/reference.asc ...`. Only report metadata is saved.
