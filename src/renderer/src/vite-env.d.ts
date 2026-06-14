/// <reference types="vite/client" />

import type { BatonApi } from "./tauri-preload";

declare global {
  interface Window {
    baton: BatonApi;
  }
}
