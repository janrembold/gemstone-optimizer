# Gem Cut Lab

A browser-based Round Brilliant geometry and optical optimization prototype. HTML, ES modules, Three.js and a Web Worker; no application backend. Select Moissanite (RI 2.65), click **Optimize Cut**, inspect the five independently evaluated finalists, and export the selected geometry as GemCad ASC.

**Real calculations, limited claims:** scores come from exact plane geometry and deterministic ray tracing. Fire and Global are explicitly provisional assessment models, not validated gem grades or certified laboratory ratings. Anisotropic materials are approximated isotropically. See [scientific definitions and limitations](docs/SCIENCE.md).

## Open directly (no installation)

Download or clone the **complete project folder**, then double-click the root `index.html`. The material selector, exact viewer, optimization worker and exports work without a local server, including offline. Keep `css/` and `standalone/` next to `index.html`; copying only the HTML file is not sufficient.

The committed `standalone/app.js` bundles the same application, Three.js and an inline Blob worker. It is generated from the modular source with `npm run build:standalone`; it contains no separate optical implementation. `npm run build` refreshes it automatically. Do not edit the generated bundle by hand.

## Develop or serve over HTTP

Requires Node.js 20.19+ or 22.12+ (tested with Node 24).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://127.0.0.1:5173). This development mode uses the modular source with live reload. The regular production build in `dist/` is intended for HTTP hosting; for direct local opening use the project-root `index.html` instead.

```sh
npm test                 # analytical, geometry, export and optimizer tests
npm run test:browser      # complete desktop workflow + mobile/validation checks
npm run validate         # numerical convergence report + reproducible example run
npm run build            # static deployment artifacts in dist/
npm run preview          # serve production build locally
npm run format:check
```

Browser tests use installed Google Chrome on macOS when present, otherwise Playwright Chromium (`npx playwright install chromium`). The tests start their own local Vite server. A built `dist/` can be hosted by any static HTTP server; it needs no API, database, account or secret. Dependencies are bundled, and system fonts work offline; the optional Google Fonts CSS is purely cosmetic.

## Material selection

Standard materials (including Moissanite, Diamant and Saphir) automatically fill their nominal RI. **Custom** clears the RI field. Typing a value switches the selection to **Other**, including when typing the same number as a standard preset. Other has no inherited dispersion or crystal properties; Fire is explicitly unavailable in the constant-index replacement model. Re-select a standard material to restore its documented optical properties.

## What is implemented

- Semantic eightfold Round Brilliant: table, 8 stars, 8 bezels, 16 upper girdles, 8 pavilion mains, 16 lower girdles, 16 planar girdle facets, point culet.
- Six primary parameters, derived plane normals and meetpoints, closed convex geometry validation before optics.
- Representative material RI data with sources, editable RI, anisotropy flags, Cauchy B–G fits / N-BK7 Sellmeier model. Missing dispersion is disclosed instead of invented.
- Snell, critical angle, total internal reflection, unpolarized Fresnel energy splitting, epsilon offsets, bounded tracing and explicit residual energy.
- Face-up energy census, 0–30° tilt curve, matched-path spectral angular separation, all requested score components and minimum metric.
- Complete coarse grid, diverse candidate selection, local fine search, 0.01° angular neighborhoods, identical higher-census final verification. Pause/resume/cancel and live Top 5 using the same high census as the final ranking.
- Exact Three.js mesh from traced facet polygons, orbit/zoom, four camera views, edges, wireframe, transparency.
- Dynamic ASC tiers with exact normal distances, signed facet angles, index positions, labels and scores; generated files are geometrically roundtrip-tested.
- Canonical configuration IDs, downloadable run JSON, load-and-recompute workflow.

All candidates in the live and final rankings use the same material, seed, ray counts and optical settings. Screening estimates are displayed separately. Every new screening record is checked immediately; verified leaders stay in an archive through completion. The final shortlist retains the raw top K as well as diverse regions. Every estimate correction is retained in the run JSON. The high census verifies numerical estimates, **not** physical accuracy against measured gems or a proven global optimum.

## Reproducible evidence

- [PROJECT_LOG.md](PROJECT_LOG.md): implementation history, decisions, file map and follow-up work.
- [SCIENCE.md](docs/SCIENCE.md): mathematical definitions, metric denominators, sources and approximations.
- [VALIDATION.md](docs/VALIDATION.md): actual convergence, parameter perturbation, bounce residual, repeated-seed and optimizer results.
- [EXHAUSTIVE-VALIDATION.md](docs/EXHAUSTIVE-VALIDATION.md): full-profile score-history audit and the screening/verification fix.
- [BL-M5.md](docs/BL-M5.md): extracted 85-facet family, flat-table correction, parameters and validation.
- [ASC-REFERENCES.md](docs/ASC-REFERENCES.md): validation against the four supplied ASC references.
- [example-run.json](docs/example-run.json): full default Moissanite run. In the app choose **Run laden**, select this file and click **Optimize Cut** to recalculate it.

No external reference score is used as an optimization target or a calibration constant. Scores are not calibrated to any external rating system. Native GemCad opening is not tested in this environment; ASC syntax, plane reconstruction and the supplied reference files are tested.

## Architecture and adding a cut

`js/cuts/cutDefinition.js` is the registry. A cut exposes `id`, `name`, `version`, `symmetry`, `parameters`, `defaults`, `precisionKeys` and `generate(parameters)`. Add a new cut there and provide a generator returning a validated convex solid:

- Unit outward facet normal `n`, normal distance `d` (`n · x ≤ d`).
- Semantic `family`, optical `region` (`crown`, `pavilion`, `girdle`), ordered polygon vertex indices and area.
- Shared vertex array, packed plane coefficients, derived dimensions and topology version.

Geometry, tracing, scoring and rendering consume that common solid. Optics uses `region`, not Round Brilliant family names. Precision refinement uses the cut's `precisionKeys`. The UI exposes Round Brilliant and BL-M5 with separate parameter schemas; a future cut needs its registry entry and selector option. Generic tier export falls back to family names.

The current intersection engine supports **convex** cuts. A nonconvex design requires a different intersection implementation behind that interface, not reuse of the convex exit-plane assumption. The cut plugin must guarantee its declared exact rotational symmetry; the current ideal-geometry symmetry score assumes this contract.

## Project layout

```text
index.html, css/app.css       UI
js/app.js                    UI state and worker communication
js/materials.js              sourced material definitions
js/cuts/                     semantic cut topology and parameter schema
js/geometry/                 vectors, planes, convex clipping, intersections
js/optics/                   Fresnel, dispersion, energy tracing, metrics
js/optimizer/                grids, regional refinement, validation, worker
js/render/                   Three.js visualization of the same facets
js/export/                   GemCad ASC writer and validation parser
js/reproducibility.js        canonical configuration hash
scripts/                     repeatable scientific/reference validation
tests/                      unit, regression and browser tests
```

### Face-up Head Shadow

The ranking now includes a 5% preference for less observer obstruction (10° half-angle), calculated using a separate reverse-ray census. Cards show `HEAD ↓`; the optical report shows blocked, unobstructed and visible observer return plus sampling uncertainty. See [the model and limitations](docs/SCIENCE.md#face-up-observer-obstruction-scoring-version-2). Existing run configurations require recomputation under the new scoring version.
