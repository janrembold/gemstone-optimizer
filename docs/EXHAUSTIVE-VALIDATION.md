# Exhaustive evaluation audit

Generated 2026-09-20T08:57:20.308Z, default Moissanite, seed 1919. Full 15,625-point coarse grid, fine and precision neighborhoods, and final shortlist. All values below are actual independent simulation outputs.

## Reproduced issue

Before the fix, the highest screening score was **77.675816**, while the best final verified score was **76.644334**. These were different sampling budgets presented in the same ranking.

Screening uses 384 face-up / 192 tilt / 192 spectral triplets. Verification uses 3,200 face-up / 2,200 per tilt / 800 spectral triplets and the full seven-angle curve. Selecting the largest estimate from many geometries preferentially selects sampling overestimates. Refinement late in the run can improve the screening objective without the same gain in the higher census. The screening estimate is not a measured convergence guarantee.

## Verified ranking after the fix

- Every displayed ranking value uses exactly the same higher census, seed and physics settings from the first candidate onward.
- Every new screening record is verified immediately and archived. The initial candidates populate the live ranking.
- No archived verified candidate is discarded at the final phase.
- The final shortlist includes the raw top K **and** geometrically diverse candidates; diversity cannot displace a raw top-K candidate.
- Assertion over every progress event: verified leader never decreases (**passed**).
- Assertion: final winner equals the largest live verified value (**passed**).
- Best final verified Global: **76.644334**. Highest screening estimate (separate, not the displayed ranking): **77.675816**.
- 39 unique geometries verified, 15970 optical evaluations, 63523115382 ray/plane tests, 237.90 seconds on this machine.

| ID          | Screening estimate | Verified Global | Brilliance | Fire      | Tilt      | Leak     |
| ----------- | ------------------ | --------------- | ---------- | --------- | --------- | -------- |
| GC-8ef82035 | 77.404048          | 76.644334       | 68.842330  | 59.898989 | 86.874644 | 6.672045 |
| GC-73dd880b | 77.294469          | 76.585377       | 68.888965  | 60.077516 | 86.025255 | 6.418211 |
| GC-81bf2339 | 77.506095          | 76.549568       | 68.536912  | 59.395956 | 87.891296 | 7.201859 |
| GC-e5ae81f9 | 77.464413          | 76.543191       | 68.448028  | 59.503531 | 87.853341 | 7.117851 |
| GC-8bfbc697 | 77.441474          | 76.539935       | 68.457115  | 59.464848 | 87.926066 | 7.220302 |

The raw [audit JSON](exhaustive-results.json) preserves each screening-to-verification correction, including downward corrections. Values are never clamped upward or replaced by the best optimistic estimate. This change improves comparison and candidate retention; it does not remove Monte Carlo uncertainty, certify a perception score, or prove a global optimum.

Re-run with `node scripts/validate-exhaustive.js`. Physics and metric definitions are unchanged; the search version is `verified-archive-2`.
