export interface TokenAlertResult {
  message: string;
  level: "warning" | "critical";
}

/**
 * Scans terminal output chunks for explicit token usage stats,
 * context limit warnings, and rate limit errors.
 */
export function detectTokenAlert(chunk: string): TokenAlertResult | null {
  if (!chunk || !chunk.trim()) return null;

  // 1. Critical context window exhaustion
  if (
    /(?:context\s*(?:window|limit|length)\s*(?:exceeded|full|reached|nearly full|exhausted)|approaching\s*(?:context|token)\s*limit|maximum\s*context\s*length)/i.test(
      chunk
    )
  ) {
    return {
      message: "Agent context window is nearly full. Capture handoff now while tokens remain to summarize!",
      level: "critical"
    };
  }

  // 2. Token percentage or usage stats (e.g. "Tokens: 85%", "Tokens: 150k/200k")
  const pctMatch = chunk.match(/(?:tokens?|usage):\s*(\d+(?:\.\d+)?%)/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    if (pct >= 75) {
      return {
        message: `Agent token usage is at ${pctMatch[1]}. Refresh handoff before the session limit expires!`,
        level: pct >= 90 ? "critical" : "warning"
      };
    }
  }

  const ratioMatch = chunk.match(/(?:tokens?|usage):\s*(\d+[kKmM]?)\s*(?:\/|of)\s*(\d+[kKmM]?)/i);
  if (ratioMatch) {
    return {
      message: `Token usage reached ${ratioMatch[1]}/${ratioMatch[2]}. Consider refreshing handoff soon.`,
      level: "warning"
    };
  }

  // 3. Claude Code /compact nudge
  if (/(?:conversation\s*is\s*getting\s*long|use\s*\/compact\s*to\s*compact)/i.test(chunk)) {
    return {
      message: "Agent conversation is getting long. Capture handoff now to prevent token loss.",
      level: "warning"
    };
  }

  // 4. Rate limit / quota warnings
  if (
    /(?:rate\s*limit\s*(?:approaching|exceeded|hit)|hourly\s*(?:rate|token)?\s*limit|quota\s*(?:exceeded|exhausted))/i.test(
      chunk
    )
  ) {
    return {
      message: "API rate or hourly token limit detected. Capture handoff to resume with another agent.",
      level: "critical"
    };
  }

  return null;
}

/**
 * Estimates token count from raw terminal bytes (~4 chars per token).
 */
export function estimateTokenCount(bytes: number): number {
  return Math.max(0, Math.round(bytes / 4));
}

/**
 * Check if cumulative session bytes indicate high context usage
 * without explicit agent CLI feedback.
 */
export function evaluateByteThreshold(bytes: number): TokenAlertResult | null {
  const tokens = estimateTokenCount(bytes);
  if (tokens >= 90000) {
    return {
      message: `High session context (~${Math.round(tokens / 1000)}k tokens). Capture handoff now before limit is reached!`,
      level: "critical"
    };
  }
  if (tokens >= 55000) {
    return {
      message: `Session context is growing (~${Math.round(tokens / 1000)}k tokens). Check limits and consider refreshing handoff.`,
      level: "warning"
    };
  }
  return null;
}
