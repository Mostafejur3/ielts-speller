/**
 * Answer normalisation + character level diff used for the
 * "highlight what you got wrong" UI.
 */

export function normalizeAnswer(value: string, strict: boolean): string {
  let out = value.replace(/\u00A0/g, " ").trim().replace(/\s+/g, " ");
  if (!strict) {
    // punctuation / diacritics insensitive, case insensitive
    out = out
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,!?;:'"()\[\]{}\-–—_/\\]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  return out.toLowerCase();
}

export function isAnswerCorrect(typed: string, expected: string, strict: boolean): boolean {
  const a = normalizeAnswer(typed, strict);
  const b = normalizeAnswer(expected, strict);
  if (!a) return false;
  return a === b;
}

export type DiffKind = "ok" | "missing" | "extra";

export interface DiffToken {
  char: string;
  kind: DiffKind;
}

/** Longest common subsequence table for two short strings. */
function lcsMatrix(a: string, b: string): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

/**
 * Aligns the expected word against what the user typed.
 * Returns tokens for both strings where unmatched characters are flagged.
 */
export function diffWords(expected: string, typed: string): { expected: DiffToken[]; typed: DiffToken[] } {
  const a = expected.toLowerCase();
  const b = typed.toLowerCase();
  const dp = lcsMatrix(a, b);
  const expTokens: DiffToken[] = [];
  const typedTokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      expTokens.push({ char: expected[i], kind: "ok" });
      typedTokens.push({ char: typed[j], kind: "ok" });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      expTokens.push({ char: expected[i], kind: "missing" });
      i++;
    } else {
      typedTokens.push({ char: typed[j], kind: "extra" });
      j++;
    }
  }
  while (i < a.length) expTokens.push({ char: expected[i++], kind: "missing" });
  while (j < b.length) typedTokens.push({ char: typed[j++], kind: "extra" });
  return { expected: expTokens, typed: typedTokens };
}
