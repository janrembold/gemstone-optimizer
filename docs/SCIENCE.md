# Scientific model, definitions and limits

Version: `round-brilliant-1` geometry, `independent-energy-2-head-shadow` scoring. This is an independently implemented geometrical-optics prototype. There are no invented score tables, random score perturbations or hand-adjusted target results.

## 1. Geometry

The stone is the intersection of convex half-spaces `nᵢ · x ≤ dᵢ`, with unit outward normals. Each plane is clipped against all other half-spaces, giving actual polygonal facets and shared meetpoints. Rendering triangulates these polygons only for display; ray tracing intersects the original planes. Normal distances are not vertical heights.

The girdle's maximum radius is 1, so full diameter is 2. Let `t = table / 100`, `g = girdle / 100`, `C = tan(crown angle)`, `P = tan(pavilion angle)` and `H = π/8`. Girdle top/bottom lie at `z = ±g`; its thickness relative to diameter is therefore the requested percentage. Crown height is `(1−t) C`; pavilion depth is `P`; culet is `(0,0,−g−P)`. The table octagon's circumradius is `t`, at `z = g + (1−t)C`.

Eight bezel planes have normal `(sin(c) cos(a), sin(c) sin(a), cos(c))` and distance `sin(c)+g cos(c)`, for `a=kπ/4`. Eight pavilion mains replace the final normal component with `−cos(p)` and use `sin(p)+g cos(p)`.

The star tip is on the intersection of adjacent bezel planes. In a sector bisector its radius is

`r_star = t cos(H) + star_fraction (1 − t cos(H))`

and its height is `g + C (1 − r_star cos(H))`. A star plane passes through this meetpoint and two neighboring table vertices. The two upper girdle planes pass through the star meetpoint and the corresponding two girdle edge endpoints. Thus the star percentage is explicitly a **projected radial fraction from table edge midpoint to circumcircle**, not a guarantee of equivalence to every trade measurement convention.

Lower-girdle meetpoints lie at radius `(1 − lower_fraction) / cos(H)` and height `−g − P lower_fraction`. This defines lower length by vertical fraction of pavilion depth (equivalent to the fraction along the straight main edge). The lower-girdle planes join those meetpoints to the lower girdle edges. Sixteen vertical planes close the polygonal girdle. Angles of stars and upper/lower girdles are derived from these meetpoints, not independent decorative triangles.

We check finite/domain-valid parameters, active nonzero-area facets, all vertices inside all half-spaces, facet coplanarity, outward winding, each edge used twice with opposite directions, Euler `V−E+F=2` and positive signed volume. Convex half-space construction excludes self-intersections. All 729 default coarse combinations pass. General near-degenerate cuts are rejected rather than traced.

There are 57 crown/pavilion facets and 16 actual girdle facets, **73 active surface facets**. Point culet has no area and adds no facet. Rotational symmetry is exact within numerical tolerances; the symmetry contract is tested under 45° rotation.

## 2. Optical conditions and ray accounting

Ambient index is 1. Incident light is unpolarized, from a cosine-weighted cone with 7° half-angle. Sample `sin(theta)=sqrt(U) sin(7°)` and uniform azimuth. A uniform square aperture perpendicular to the observer axis encloses the stone projection plus a conservative cone margin. Missed rays are discarded. Every accepted ray has unit incident energy; all surfaces that intercept illumination are eligible, including at tilt. A seeded 32-bit LCG supplies repeatable samples; this is pseudo-random quadrature, never noise added to scores.

A convex slab intersection finds the entry plane. At each boundary use Snell's law, vector refraction and exact scalar unpolarized Fresnel reflectance:

`sin(theta_t) = (n1/n2) sin(theta_i)`

`R = (Rs + Rp)/2`, `T = 1 − R`.

When the transmitted sine would exceed 1, total internal reflection sets `R=1`. Both reflected and transmitted energies are accounted for. The exterior reflected branch at first entry is logged separately; it is excluded from brilliance. Inside the solid, the transmitted branch leaves permanently (convexity), while the reflected branch continues with reduced energy. All subsequent reflection/refraction events are included until the bounce/energy limit.

Normals and directions are double precision; planes are packed in a `Float64Array`. Half-space tolerance is 1e-9 radius units, shared vertex tolerance 1e-7, ray offset 1e-8, positive intersection threshold 1e-10, parallel denominator threshold 1e-12. The default limit is 48 internal encounters and energy cutoff 1e-7. **Residual energy is always retained as a separate category**, including at the bounce limit; it is not invented absorption or counted as leakage. Convergence at 24/48/96/192 encounters is reported in the validation report.

Energy identity (per accepted incident ray):

`useful crown + other crown + pavilion/girdle leakage + entry reflection + residual = 1`.

Brilliance and leakage use the **incident intercepted energy** denominator, not only the energy that survived Fresnel entry. This choice materially reduces high-RI brilliance compared with a ray-count statistic that ignores Fresnel losses. The UI also reports a Monte Carlo standard error for Brilliance, computed from the sample energy variance. It measures sampling uncertainty only, not systematic model error or a certified error bar.

## 3. Material and spectral model

Material defaults are representative values; composition, wavelength, crystal direction and temperature matter. Anisotropic flag is retained for moissanite, corundum, quartz and topaz. We do **not** trace the ordinary/extraordinary rays separately.

| Material       | Nominal RI | B–G dispersion | Model/source                                                    |
| -------------- | ---------- | -------------- | --------------------------------------------------------------- |
| Diamond        | 2.417      | 0.044          | GIA 1997 comparison table                                       |
| Moissanite     | 2.650      | 0.104          | GIA: principal indices 2.648 / 2.691; 2.65 requested default    |
| Cubic zirconia | 2.160      | 0.060          | Representative within GIA's 2.150–2.180, dispersion 0.058–0.066 |
| Corundum       | 1.768      | 0.018          | Representative within GIA's 1.762–1.770                         |
| Natural spinel | 1.718      | unavailable    | GIA 1988; not substituted with synthetic spinel dispersion      |
| Quartz         | 1.544      | unavailable    | GIA quartz data; isotropic approximation                        |
| Topaz          | 1.619      | unavailable    | GIA Pakistan topaz measurements; representative choice          |
| YAG            | 1.833      | 0.028          | GIA 1997 comparison table                                       |
| Glass (N-BK7)  | 1.51680    | Sellmeier      | SCHOTT coefficients                                             |

For sourced B–G dispersion use the two-term Cauchy approximation

`n(lambda) = nD + B [lambda⁻² − 589.3⁻²]`,

`B = (nG − nB) / (430.8⁻² − 686.7⁻²)` with wavelengths in nm.

This matches the tabulated interval and nominal D-line RI, but it is **not** a spectroscopically fitted full dispersion curve. N-BK7 uses the manufacturer's Sellmeier coefficients (wavelength in µm): `n² = 1 + Σ Bᵢ lambda² / (lambda² − Cᵢ)`. Its nominal anchor is 587.6 nm (helium d), unlike sodium D for the Cauchy materials; the UI labels the field as nominal RI. In the UI, selecting Custom clears RI; any manually typed RI switches to Other and removes the previous material’s dispersion and crystal metadata. Other is a constant-index replacement model with unknown anisotropy. The low-level material API can still represent a documented material with a shifted RI for controlled research, but the interactive workflow never silently inherits its dispersion after a manual edit.

For spinel, quartz and topaz we deliberately do not invent dispersion coefficients: the model uses constant RI, produces zero modelled Fire, and warns that Fire/Global are incomplete for that material. This zero is a statement about the nondispersive replacement model, **not the real material's fire**.

## 4. Metrics

All normalized values are between 0 and 100. Raw energy budgets, angular separation, sample counts and tilt data remain in the run JSON.

- **Brilliance:** 100 × sum of energy leaving a crown facet within 64° of the observer axis / accepted incident rays. Face-up uses the nominal RI. No claim of realistic room/environment lighting.
- **Leak:** 100 × transmitted energy exiting pavilion or girdle / accepted incident rays. Lower is better. Surface reflection, off-cone crown exits and residual are separate losses; `100−Leak` is not equal to Brilliance.
- **Tilt:** absolute Brilliance is recomputed with illumination/observer axis inclined to the stone's z-axis. `min(100, 100 B20/B0)`; defined as zero if B0 is effectively zero. Verification records 0/5/10/15/20/25/30°. Tilt axis azimuth is fixed, not rotationally averaged. Read ratio alongside absolute return.
- **Fire (provisional):** trace the same incident rays at 450, 550 and 650 nm. Match returned branches by their **entire facet encounter history**, and require useful crown return at all three wavelengths. Weight each path by the minimum of its three returned energies. Sum this common energy only when red/blue angular separation is at least **0.25°**, divide by accepted incident triplets, multiply by 100. Also report mean separation in degrees and total matched-path energy. The threshold is an explicit observer-resolution modelling choice, not a fitted empirical constant or a validated perception law. This conservative path matcher excludes wavelength-dependent path changes and can undercount their fire. No arbitrary RI multiplier is used.
- **Scintillation (provisional proxy):** `100 (1 − exp(−n/45))`, with `n` the number of active surface facets, **including the 16 planar girdle facets**. Hence our model has n=73 and roughly 80.25, rather than n=57 and 71.82 for the crown/pavilion facets alone. This is a geometric density proxy from the requested methodology, not a dynamic light simulation.
- **Symmetry:** 100 for the mathematically exact declared rotational/mirror symmetry: eightfold Round Brilliant or twelvefold BL-M5 with the corrected flat table, verified by geometry tests. No simulated manufacturing noise. Future cut generators must uphold their declared symmetry contract.
- **Global (provisional):** `0.95 × base + 0.05 × (100 − HeadShadow)`, where `base = 0.34 B + 0.20 F + 0.16 T + 0.10 Sc + 0.10 Sy + 0.10 (100 − Leak)`. The original component ratios are preserved within the 95% base. Five percent is a user preference, not an experimentally established constant. A weighted decision score, not a physical observable.
- **minimumMetric:** `min(B, F, T, Sc, 100−Leak)`. Stored and displayed to expose tradeoffs. Other optimization objectives are extension points, not currently implemented modes.

Census sizes, illumination/viewing cones, the tilt ratio, facet-count relationship and weights follow the requested prototype specification. The spectral fire algorithm and energy bookkeeping here are independent. Do not interpret equal numeric values as equal physical performance in two different engines.

## 5. Search and reproducibility

Parameter ranges have min/max/coarse/fine settings. Fast multiplies coarse steps by 2 (64 points on defaults), Balanced uses the entered coarse steps (729), Exhaustive halves them (15,625). Every point on the resulting coarse grid is visited, including range endpoints. The remaining stages select diverse high-performing parameter regions, search coordinate neighbors at the requested fine steps (1/2/3 passes by preset), then a 5×5 grid at 0.01° spacing around the best angular regions. This final neighborhood is not a complete 0.01° search of the original range.

Low-census settings are identical throughout screening within each preset. These estimates are used only for search and shown separately from the ranking. Every new screening record is immediately evaluated with the full final census; the first five candidates also seed the verified ranking. All verified candidates are retained in an archive. The displayed live Top 5 and the final Top 5 always rank that archive using identical sample counts, seed, spectral settings and tilt angles. No value is artificially clamped upward: the maximum of an expanding archive of fixed evaluations simply cannot decrease.

At the end, the raw top 8/10/12 screening candidates **plus** 8/10/12 diverse-region candidates are nominated, deduplicated and verified if not already cached. Diversity can add candidates but cannot exclude a numerical top-K candidate. Previous verified leaders remain eligible even if they leave the screening pool. The run JSON records each candidate's screening Global, verified Global, difference and reason for verification in `verificationHistory`. Downward corrections of noisy estimates are preserved rather than hidden.

Advanced final counts must be at least twice the preset screening count; smaller values are rejected. Fine and precision search still optimize the low-census objective, so late improvements there are not a proof of improved high-census performance. Searching many geometries can preferentially select favorable sampling error. A fixed seed ensures reproducibility, not correctness or statistical independence. The verification rays use the same deterministic seed with a larger budget; this is not an independent hold-out experiment. Narrow optima can be missed, and tiny final differences may still be sampling noise. Neither the archive nor Exhaustive proves a continuous global optimum.

Progress and ETA now weight screening and verification by ray budgets, including the full tilt curve; new verification work can revise the estimate. The worker yields between candidates, throttles ordinary messages and sends confirmed archive updates immediately. Cancellation terminates the worker. One worker keeps CPU use conservative. Pause latency is one current evaluation; unusually high advanced ray counts extend that latency.

Every result stores geometry/topology version, search version, parameters, material including spectral coefficients, seed, all optical settings, optimizer configuration and scoring version. A canonical sorted-key serialization is hashed using 32-bit FNV-1a for a compact noncryptographic ID; the full JSON is the authoritative record because short hashes can collide. Same seed/code/input produces deterministic results on the tested runtime. Floating-point math can vary slightly across JS engines; exact cross-engine bitwise identity is not guaranteed.

## 6. ASC manufacturing representation

Writer uses the documented GemCad 5.0 header, gear, symmetry, RI, heading, `a` records with signed angles and normalized perpendicular distances, `n` labels and `F` comments. Angles come directly from facet normals, indices from normal azimuth × gear / 360°. Identical semantic family/angle/distance planes form one tier. Pavilion inclination is negative, table 0°, girdle ±90°. Distances use the same radius=1 geometry as the tracer and viewer.

All app families now construct integer-index geometry before simulation, with symmetry-preserving distinct tooth assignment and rebuilt plane intersections. The selected gear is a geometry constraint, not merely an export representation. Export rejects fractional indices or a different gear and writes integer index tokens, retaining 10 angular and 12 distance decimal places. See [integer indexing](INTEGER-INDICES.md) for the construction, changed geometry versions and validation.

The four supplied ASC designs are validation references only, not copied facet values. Native GemCad import is not available here; see [ASC reference report](ASC-REFERENCES.md) for the verified scope.

## 7. What is not physically modelled

Birefringent ray splitting, crystal orientation, polarization state carried between successive interfaces, absorption/colour, fluorescence, inclusions, facet roughness, diffraction, wave interference, finite eye pupil, detailed head geometry/skin reflection, true spectral source/observer response, jewelry settings, nonconvex stones and manufacturing tolerances are not implemented. The renderer is a geometry viewer with conventional GPU shading; its appearance is not the CPU optical census.

No measurement of actual cut stones validates our Global/Fire values yet. Analytic optics, conservation, convergence and known primary proportions validate the implementation within its assumptions, not an end-to-end gemological grading system.

## Sources consulted

1. [GemCad for Windows user manual, ASC format](https://www.gemcad.com/downloads/gemcadman.pdf), p. 21. Field grammar and signed-angle convention.
2. [Tolkowsky, Diamond Design (1919)](https://www.folds.net/diamond_design/). Primary brilliant proportions and historical optics.
3. [Nassau et al., Synthetic Moissanite, GIA 1997](https://www.gia.edu/gems-gemology/winter-1997-synthetic-moissanite-nassau0) and [issue containing material comparison table](https://www.gia.edu/doc/WN97.pdf). RI/dispersion/anisotropy.
4. [GIA quartz](https://www.gia.edu/rose-quartz), [GIA natural spinel measurements](https://www.gia.edu/doc/WN88.pdf), [GIA topaz](https://www.gia.edu/doc/Pink-Topaz-from-Pakistan.pdf).
5. [SCHOTT optical glass](https://www.schott.com/en-us/products/optical-glass-p1000267), [N-BK7 datasheet](https://media.schott.com/api/public/content/41e799d0bf874807a0bb8e702fbb75b5?v=54856406). Sellmeier coefficients and line indices.

Sources checked 2026-09-19. Supplied reference ASC originals are recorded by SHA-256 and are not republished.

## Face-up observer obstruction (scoring version 2)

A separate reverse-ray census uses parallel camera rays uniformly distributed over the projected stone silhouette, nominal material RI, and the same face-ray count and seed as verification. Fresnel-weighted paths terminate in a uniform unit-radiance upper hemisphere (world z > 0); the lower hemisphere is black. All exterior exit directions are considered, including the directly reflected surface branch. Optical reciprocity connects these air-to-air path throughputs to camera radiance. The existing depolarized-interface approximation still applies.

A black cone centered on the observer blocks directions within a **10° half-angle**. HeadShadow is the lost radiance averaged over the silhouette, in percentage points of unit environment radiance, not a percentage of the remaining return. Unobstructed observer return = visible return + HeadShadow. Its sampling standard error is reported. These observer channels overlap the existing energy ledger and must never be added to that ledger.

The half-angle convention follows the [Gem Cut Studio manual, p. 18](https://www.gemcutstudio.com/app_download/UserManual_v100.pdf). This is an independent face-up model, not a numerical reproduction of that application's tilt graph. The supplied image alone does not define the exact stone geometry, environment, sampling or polarization treatment. The original Brilliance/Tilt metrics retain their original illumination model; only the explicitly documented composite score combines them with this additional observer model.

A 10-percentage-point reduction in HeadShadow improves Global by 0.5 points at otherwise equal metrics. Zero weight reproduces the previous objective exactly for numerical audits. Production defaults, angle and weight are recorded in each result's optical settings and configuration ID. Older run configurations can be imported, but must be recomputed; their scores are not reused.

## Additional cut family: BL-M5

[BL-M5](BL-M5.md) uses the supplied ASC half-spaces, correcting only the table to exactly 0° as requested. Its 85-facet geometry, own angle/distance parameters and `bl-m5-flat-table-1` topology are independent of Round Brilliant. The same energy-conserving tracing and Head Shadow model evaluate both families; no source material name or external score supplies an optical result.

## Leonardo image-derived approximation

[Leonardo](LEONARDO-ANALYSE.md) is an explicit inverse-image fit, not recovered original cutting data. Fivefold rotation is enforced; mirror symmetry is not asserted. The user authorized a constructed girdle. The registered app generator subsequently applies integer indexing; the image-fit residuals describe the unquantized source, not the final integer geometry. Every simulated surface is planar and validated, but that does not establish fidelity to the manufacturer original. The fixed 80-sided girdle affects the existing facet-count scintillation proxy and thus limits cross-family interpretation of Global. The fitting assumptions, numerical edge residuals and weight sensitivity are recorded in the analysis.

## Leo JR Edition: constrained three-tier pavilion

[Leo JR Edition](LEO-JR-EDITION.md) now enforces three pavilion inclinations with 20/10/5 facets. The 20 basis facets are evenly spaced at 18°, share one plane distance and define an identically indexed regular 20-sided girdle. Intermediate and tip tiers have fixed fivefold index patterns. All three distances are recomputed from shared tier angles and radial crossings derived from the prior image fit; no per-facet pavilion fitting or azimuth rounding follows. The generator verifies tier counts and complete basis/girdle attachment edges before ray tracing. Initial angles and crossing radii remain image-derived approximations, not manufacturer cutting data. The crown continues to use the image-fit source, and the scoring limitations remain unchanged.
