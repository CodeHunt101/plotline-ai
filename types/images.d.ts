// Type declarations for static image imports (PNG, JPG, SVG, WebP, AVIF, ICO, BMP, GIF).
// Next.js generates these via next-env.d.ts at runtime, but that file is gitignored.
// This file ensures tsc resolves image imports correctly in CI and other non-Next.js contexts.
declare module "*.png" {
  const value: import("next/image").StaticImageData;
  export default value;
}

declare module "*.jpg" {
  const value: import("next/image").StaticImageData;
  export default value;
}

declare module "*.jpeg" {
  const value: import("next/image").StaticImageData;
  export default value;
}

declare module "*.webp" {
  const value: import("next/image").StaticImageData;
  export default value;
}

declare module "*.avif" {
  const value: import("next/image").StaticImageData;
  export default value;
}

declare module "*.svg" {
  const value: import("next/image").StaticImageData;
  export default value;
}

declare module "*.gif" {
  const value: import("next/image").StaticImageData;
  export default value;
}

declare module "*.ico" {
  const value: import("next/image").StaticImageData;
  export default value;
}

declare module "*.bmp" {
  const value: import("next/image").StaticImageData;
  export default value;
}
