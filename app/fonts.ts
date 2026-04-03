import { Syne, Inter } from "next/font/google";

const syneInit = Syne({
  weight: ["800"],
  subsets: ["latin"],
  variable: "--ff-display",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  preload: true,
  adjustFontFallback: false,
});

const interInit = Inter({
  weight: ["500"],
  subsets: ["latin"],
  variable: "--ff-sans-serif",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
});

export const syne = syneInit.variable;
export const inter = interInit.variable;
