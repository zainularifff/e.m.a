import type { CSSProperties as ReactCSSProperties } from "react";

declare global {
  namespace React {
    type CSSProperties = ReactCSSProperties;
  }
}

export {};
