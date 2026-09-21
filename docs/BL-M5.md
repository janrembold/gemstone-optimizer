# BL-M5 cut family

The user-supplied `BL-M5.asc` defines a round, nominally twelvefold, two-tier crown design with 85 facets. We retain the supplied design name; its facet layout alone does not establish a different standardized cut name. File comments are provenance, not application instructions.

Source SHA-256: `e337156e4ad20d41435cd01239f2927956675b966881bc7c3ee7064fa113e5fb`. The numerical ASC records are preserved in [the test fixture](../tests/fixtures/bl-m5.asc). Its hash differs because descriptive headers were omitted. The source file itself is not edited.

## Extracted planes and requested correction

All distances below are signed outward-normal plane distances from the original coordinate origin: `n · x ≤ d`. The girdle plane distance is 1; this is an apothem normalization, not a circumradius of exactly 1.

| Tier | Region   | Facets | Angle (degrees) | Normal distance | Index positions (96 gear) |
| ---- | -------- | ------ | --------------- | --------------- | ------------------------- |
| p1   | Pavilion | 24     | −41.494175      | 0.68520846      | 2, 6, 10, …, 94           |
| g    | Girdle   | 24     | 89.999875       | 1.00000000      | 2, 6, 10, …, 94           |
| c1   | Crown    | 24     | 32.221737       | 0.55879610      | 2, 6, 10, …, 94           |
| c2   | Crown    | 12     | 30.079455       | 0.53960117      | 96, 8, 16, …, 88          |
| T    | Table    | 1      | **0 exactly**   | 0.30757899      | immaterial at zero angle  |

**Explicit user correction:** the source table has angle 0.000994° at index 24. The application replaces only its normal with `[0, 0, 1]` and retains distance 0.30757899. All 84 other planes remain identical at default parameters. The table vertices therefore lie at exactly `z = 0.30757899` within floating-point tolerance. The girdle retains its slight 0.000125° taper. This taper is rotationally symmetric and does not prevent exact twelvefold rotational and mirror symmetry after flattening the table. Geometry tests verify both 30° rotation and reflection.

The corrected solid has 85 vertices, 168 edges, 85 facets, Euler characteristic 2, and volume 1.668353170089277 in source coordinate units. There are 61 optical crown/pavilion facets plus 24 girdle facets, and a point culet. The maximum projected girdle diameter is 2.017258054333155; total depth is **60.5962063%** of that diameter, and maximum projected table diameter is **55.9990739%**. These are derived geometric measurements, not input table/girdle percentages borrowed from Round Brilliant.

## Parameterization and UI

Choose **BL-M5** in the cut-family selector. The preview shows the supplied design with the requested flat table. The optimizer can vary p1, c1 and c2 angles independently. Default ranges are ±0.2° around each source angle, coarse step 0.1°, fine step 0.05°, with 0.01° angular refinement. Four explicit normal-distance parameters describe p1, c1, c2 and T; min and max initially coincide with the source values, so those distances remain fixed. Changing them changes proportions and may produce invalid/inactive facets, which are rejected by the same geometric validator. This is a half-space parameterization, not a meetpoint-preserving cutting sequence.

There are no Round Brilliant star-length or lower-girdle parameters in BL-M5. The two cuts have separate schemas, defaults and topology versions. Switching cuts clears old result cards and exports; run JSON import selects the recorded cut before applying its parameters. Material remains an independent choice; the source specifies nominal Moissanite RI 2.65, matching the app's default material.

The flat table is a fixed rule of topology version `bl-m5-flat-table-1`, including every optimized candidate and ASC export. It is not another search variable. A corrected reference export is available in [BL-M5-reference.asc](BL-M5-reference.asc).

## Validation

`npm test` checks source-plane identity with the one requested exception, closure, positive volume, Euler topology, twelvefold rotation and mirror symmetry, all 125 default coarse-grid geometries, and plane-for-plane ASC roundtrips for default and perturbed parameters. Optical tests verify determinism, energy conservation and the shared high-census ranking invariant for this new family.

`node scripts/validate-bl-m5.js` regenerates [bl-m5-results.json](bl-m5-results.json): corrected-reference metrics at 800, 3,200 and 12,800 face rays plus a complete default Fast run (344 evaluations, 20 verified candidates in this audit). The JSON is importable with **Run laden**. With 12,800 face rays, 8,800 rays per tilt and 3,200 spectral triplets, the corrected reference produced Global 78.103779, Brilliance 70.288133, Tilt 82.964006, HeadShadow 7.322604 and Leak 7.528808. Head-shadow sampling standard error was 0.084935 percentage points. These are outputs of this app's documented model, not Gem Cut Studio equivalents, laboratory validation, or a proven global optimum.

The shared physics limitations still apply, especially isotropic treatment of Moissanite and provisional Fire/Global perception metrics. Scintillation remains the existing facet-count proxy, so cross-family comparisons inherit that limitation.
