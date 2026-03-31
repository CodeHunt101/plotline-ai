import ParticipantsSetup from "@/components/features/ParticipantsSetup";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Group movie recommendations",
  description:
    "Get tailored movie recommendations for your group by setting party size, available time, and each person's favourite films.",
  alternates: {
    canonical: "/",
  },
};

export default async function MovieNightForm() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "en-AU",
      },
      {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "EntertainmentApplication",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        inLanguage: "en-AU",
        featureList: [
          "Group movie recommendations",
          "Preference-based matching",
          "Movie poster and synopsis browsing",
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // react-doctor-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ParticipantsSetup />
    </>
  );
}
