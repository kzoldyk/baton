/// <reference types="vite/client" />

import type { BatonApi } from "../../preload";

declare global {
  interface Window {
    baton: BatonApi;
  }
}
