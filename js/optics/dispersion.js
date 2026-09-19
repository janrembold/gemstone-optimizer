export const wavelengths = [450, 550, 650];
export function refractiveIndex(m, nm) {
  if (m.sellmeier) {
    const l2 = (nm / 1000) ** 2;
    return (
      Math.sqrt(1 + m.sellmeier.B.reduce((s, b, i) => s + (b * l2) / (l2 - m.sellmeier.C[i]), 0)) +
      (m.ri - m.referenceRI)
    );
  }
  if (m.dispersion == null) return m.ri;
  // Two-term Cauchy fit to B–G dispersion, anchored at sodium D (589.3 nm).
  const B = m.dispersion / (1 / 430.8 ** 2 - 1 / 686.7 ** 2);
  return m.ri + B * (1 / nm ** 2 - 1 / 589.3 ** 2);
}
export const hasDispersion = (m) => m.dispersion != null || !!m.sellmeier;
