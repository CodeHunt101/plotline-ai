import type { Metadata } from "next";
import MovieFormClient from "./MovieFormClient";

export const metadata: Metadata = {
  title: "Your movie preferences",
  description:
    "Tell PlotlineAI each participant's favourite films and moods so we can match your group with tailored recommendations.",
  alternates: {
    canonical: "/movieForm",
  },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
      noimageindex: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function MovieFormPage() {
  return <MovieFormClient />;
}
