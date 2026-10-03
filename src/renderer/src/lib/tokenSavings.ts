import type { GitStatus } from "../../../shared/types";

export type TokenSavings = {
  passTokens: number;
  repoTokens: number;
  savedTokens: number;
  savingsPercent: number;
  formattedBadge: string;
};

export function calculateTokenSavings(
  content: string = "",
  gitStatus?: GitStatus | { additions?: number; deletions?: number; changedFiles?: unknown[] }
): TokenSavings {
  // Estimated pass tokens based on 4 characters per token
  const passTokens = Math.max(1, Math.round((content.length || 0) / 4));

  // Diff additions/deletions + file count estimate ~ 25k-60k tokens
  const fileCount = gitStatus?.changedFiles?.length ?? 6;
  const churn = (gitStatus?.additions ?? 0) + (gitStatus?.deletions ?? 0);

  // Baseline repo context estimate for a coding agent reading repo files
  const rawRepoEstimate = 32000 + fileCount * 1000 + Math.round(churn * 2.5);
  const repoTokens = Math.max(25000, Math.min(60000, rawRepoEstimate));

  const savedTokens = Math.max(0, repoTokens - passTokens);
  const savingsPercent = Math.min(99, Math.max(0, Math.round((savedTokens / repoTokens) * 100)));

  const formatK = (tokens: number): string => {
    if (tokens >= 1000) {
      return `~${Math.round(tokens / 1000)}k`;
    }
    return `~${tokens}`;
  };

  const formattedBadge = `~${passTokens} tokens · Saved ${formatK(savedTokens)} tokens (${savingsPercent}%)`;

  return {
    passTokens,
    repoTokens,
    savedTokens,
    savingsPercent,
    formattedBadge
  };
}
