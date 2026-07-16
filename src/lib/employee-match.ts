/** Levenshtein distance for fuzzy employee code matching */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function fuzzyMatchCode(
  guess: string,
  codes: number[],
  maxDistance = 2
): number | null {
  const guessStr = guess.replace(/\D/g, "");
  if (!guessStr) return null;

  const exact = codes.find((c) => String(c) === guessStr);
  if (exact !== undefined) return exact;

  let best: number | null = null;
  let bestDist = maxDistance + 1;
  for (const code of codes) {
    const dist = levenshtein(guessStr, String(code));
    if (dist <= maxDistance && dist < bestDist) {
      bestDist = dist;
      best = code;
    }
  }
  return best;
}
