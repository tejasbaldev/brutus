/** A fresh 32-bit seed. The only place the app reaches for real randomness. */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}
