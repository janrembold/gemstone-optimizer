export { evaluate } from '../optics/metrics.js';
import { opticalDefaults } from '../optics/rayTracer.js';
export function opticalDefaultsForRun(config, preset, final) {
  return {
    ...opticalDefaults,
    seed: config.seed,
    ...(final
      ? config.verification
      : {
          faceRays: preset.faceRays,
          tiltRays: preset.tiltRays,
          spectralRays: preset.spectralRays,
        }),
    fullTilt: final,
  };
}
