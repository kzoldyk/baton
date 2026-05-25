type Pattern = { regex: RegExp; replace: (match: string, ...groups: string[]) => string };

const PATTERNS: Pattern[] = [
  {
    regex: /((?:API_KEY|SECRET|TOKEN|DATABASE_URL|PASSWORD|PRIVATE_KEY|GH_TOKEN|GITHUB_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|HF_TOKEN|NPM_TOKEN|PAT|DEPLOY_KEY)\s*=\s*)[^\s\n\r]+/gi,
    replace: (_match, prefix) => `${prefix}REDACTED`
  },
  {
    regex: /((?:apiKey|secret|token|password|privateKey)["']?\s*[:=]\s*["'])[^"'\n\r]+(["'])/g,
    replace: (_match, prefix, suffix) => `${prefix}REDACTED${suffix}`
  },
  {
    regex: /(ghp_|gho_|ghu_|ghs_|ghr_)[\w-]{36,}/g,
    replace: (match) => match.length > 20 ? "REDACTED_TOKEN" : match
  },
  {
    regex: /\b(sk-[a-zA-Z0-9]{20,})\b/g,
    replace: () => "REDACTED_API_KEY"
  },
  {
    regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
    replace: () => "REDACTED_PRIVATE_KEY"
  },
  {
    regex: /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+OPENSSH\s+PRIVATE\s+KEY-----/g,
    replace: () => "REDACTED_PRIVATE_KEY"
  },
];

export function redactSecrets(value: string): string {
  return PATTERNS.reduce((text, { regex, replace }) => text.replace(regex, (...args: string[]) => replace(args[0], ...args.slice(1))), value);
}
