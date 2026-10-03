import React from "react";
import logoUrl from "../assets/logo.png";

export function BatonLogo({ size = 32, className }: { size?: number; className?: string }): JSX.Element {
  return (
    <img
      src={logoUrl}
      alt="Baton"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 object-contain select-none pointer-events-none ${className ?? ""}`}
    />
  );
}

