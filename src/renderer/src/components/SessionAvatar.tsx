import { useEffect, useRef } from "react";
import "agent-robot-avatar";
import { resolveSessionAvatarSpec } from "../../../shared/sessionAvatar";
import type { TerminalSession } from "../../../shared/types";

type AvatarEl = HTMLElement & {
  setHeadRoundness?: (value: number) => void;
  play?: (action: string) => Promise<unknown> | unknown;
};

export function SessionAvatar({
  session,
  size = 28,
  className
}: {
  session: Pick<TerminalSession, "id" | "status" | "avatarColor" | "avatarHeadRoundness">;
  size?: number;
  className?: string;
}) {
  const ref = useRef<AvatarEl | null>(null);
  const spec = resolveSessionAvatarSpec(session);

  useEffect(() => {
    ref.current?.setHeadRoundness?.(spec.headRoundness);
  }, [spec.headRoundness]);

  useEffect(() => {
    const el = ref.current;
    if (!el?.play) return;
    if (session.status === "running") void el.play("waiting");
    else if (session.status === "failed") void el.play("failure");
    else if (session.status === "completed") void el.play("success");
    else void el.play("idle");
  }, [session.status]);

  return (
    <agent-robot-avatar
      ref={ref}
      className={className}
      size={String(size)}
      color={spec.color}
      auto-sleep="0"
      wake-on="activity"
      motion="auto"
    />
  );
}
