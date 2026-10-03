import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "agent-robot-avatar": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        size?: string;
        color?: string;
        "auto-sleep"?: string;
        "wake-on"?: string;
        motion?: string;
      };
    }
  }
}
