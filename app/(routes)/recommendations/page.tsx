import type { Metadata } from "next";
import RecommendationsClient from "./RecommendationsClient";

export const metadata: Metadata = {
  title: "Your recommendations",
  description:
    "Browse AI-picked films for your group, with posters and synopses to help you choose what to watch.",
  alternates: {
    canonical: "/recommendations",
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

export default function RecommendationsPage() {
  return <RecommendationsClient />;
}
