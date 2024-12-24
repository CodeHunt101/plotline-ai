import {  Carter_One, Roboto_Slab } from "next/font/google";

const carterOneInit = Carter_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--ff-serif",
  fallback: ["serif"],
  preload: true,
  adjustFontFallback: false,
});
const robotoSlabInit = Roboto_Slab({
  weight: ["300", "400", "700"],
  display: "swap",
  subsets: ["latin"],
  variable: "--ff-sans-serif",
  fallback: ["sans-serif"],
  preload: true,
  adjustFontFallback: false,
});

export const carterOne = carterOneInit.variable;
export const robotoSlab = robotoSlabInit.variable;
