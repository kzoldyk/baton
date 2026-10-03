/** Deterministic session robot look. Shape = head roundness (library axis 0–100). */

export type SessionAvatarSpec = {
  color: string;
  headRoundness: number;
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    const color = lig - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

export function avatarSpecFromSessionId(sessionId: string): SessionAvatarSpec {
  const h = hashString(sessionId);
  const hue = h % 360;
  const sat = 42 + (h % 28);
  const lit = 36 + ((h >>> 9) % 16);
  const headRoundness = 6 + ((h >>> 4) % 89);
  return { color: hslToHex(hue, sat, lit), headRoundness };
}

export function resolveSessionAvatarSpec(session: {
  id: string;
  avatarColor?: string;
  avatarHeadRoundness?: number;
}): SessionAvatarSpec {
  if (session.avatarColor && session.avatarHeadRoundness != null) {
    return { color: session.avatarColor, headRoundness: session.avatarHeadRoundness };
  }
  return avatarSpecFromSessionId(session.id);
}
