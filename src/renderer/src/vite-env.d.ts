/// <reference types="vite/client" />

import type React from "react";
import type { BatonApi } from "../../preload";

declare global {
  interface Window {
    baton: BatonApi;
  }

  namespace JSX {
    interface IntrinsicElements {
      "agent-robot-avatar": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          size?: number | string;
          color?: string;
          "auto-sleep"?: number | string;
          "wake-on"?: string;
          motion?: string;
          ref?: React.Ref<any>;
        },
        HTMLElement
      >;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "agent-robot-avatar": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          size?: number | string;
          color?: string;
          "auto-sleep"?: number | string;
          "wake-on"?: string;
          motion?: string;
          ref?: React.Ref<any>;
        },
        HTMLElement
      >;
    }
  }
}

