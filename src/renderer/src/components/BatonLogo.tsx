import React from "react";

export function BatonLogo({ size = 32, className }: { size?: number; className?: string }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Orange Base rounded square */}
      <rect x="0" y="0" width="32" height="32" rx="8" fill="#F26A1B" />

      {/* Dark Border / shadow detail of orange base */}
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="#BF4B0B" strokeOpacity="0.3" />

      {/* Black Mask */}
      {/* Rows 8 to 17, Cols 4 to 27 */}
      <path
        d="M 6 8 H 26 V 18 H 6 Z
           M 5 9 H 6 V 17 H 5 Z
           M 4 10 H 5 V 16 H 4 Z
           M 26 9 H 27 V 17 H 26 Z
           M 27 10 H 28 V 16 H 27 Z"
        fill="#0D0E11"
      />

      {/* White Eye Backing */}
      <rect x="6" y="11" width="8" height="4" fill="#FFFFFF" />
      <rect x="16" y="11" width="8" height="4" fill="#FFFFFF" />

      {/* Black Pupils (Looking Right - right 4x4 squares inside white backing) */}
      <rect x="10" y="11" width="4" height="4" fill="#0D0E11" />
      <rect x="20" y="11" width="4" height="4" fill="#0D0E11" />

      {/* Speech Bubble (White Base) */}
      {/* Rows 17 to 24, Cols 9 to 23 */}
      <path
        d="M 10 17 H 22 V 25 H 10 Z
           M 9 18 H 10 V 24 H 9 Z
           M 22 18 H 23 V 24 H 22 Z
           M 8 20 H 9 V 22 H 8 Z
           M 23 20 H 24 V 22 H 23 Z"
        fill="#FFFFFF"
      />
      {/* Speech Bubble Tail */}
      <path
        d="M 21 25 H 23 V 26 H 21 Z
           M 22 26 H 24 V 27 H 22 Z
           M 23 27 H 24 V 28 H 23 Z"
        fill="#FFFFFF"
      />

      {/* Speech Bubble Dots (...) */}
      <rect x="12" y="20" width="2" height="2" fill="#0D0E11" />
      <rect x="16" y="20" width="2" height="2" fill="#0D0E11" />
      <rect x="20" y="20" width="2" height="2" fill="#0D0E11" />
    </svg>
  );
}
