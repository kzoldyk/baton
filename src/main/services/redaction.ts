const SECRET_PATTERNS = [
  /((?:API_KEY|SECRET|TOKEN|DATABASE_URL|PASSWORD|PRIVATE_KEY)\s*=\s*)[^\s\n\r]+/gi,
  /((?:apiKey|secret|token|password|privateKey)["']?\s*[:=]\s*["'])[^"'\n\r]+(["'])/g
];

export function redactSecrets(value: string): string {
  return SECRET_PATTERNS.reduce((text, pattern) => {
    return text.replace(pattern, (_match, prefix: string, suffix = "") => `${prefix}REDACTED${suffix}`);
  }, value);
}
