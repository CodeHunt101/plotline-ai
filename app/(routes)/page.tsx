import ParticipantsSetup from "@/components/features/ParticipantsSetup";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/config/site";
// import { initialiseEmbeddingsStorage } from "@/lib/services/embeddings"
// import { getBaseUrl } from "@/lib/utils/urls"
// import { headers } from "next/headers"

// export const dynamic = 'force-dynamic'

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

  try {
    // const headersList = await headers()
    // const baseUrl = getBaseUrl(headersList)

    // await initialiseEmbeddingsStorage(baseUrl)
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <ParticipantsSetup />
      </>
    );
  } catch (error) {
    console.error(error);
    return <div className="p-4 text-red-600">Failed to initialise. Please try again later.</div>;
  }
}
