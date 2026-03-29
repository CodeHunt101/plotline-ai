import type { Metadata } from "next";
import "./globals.css";
import { carterOne, robotoSlab } from "./fonts";
import { MovieProvider } from "@/contexts/MovieContext";
import Header from "@/components/features/Header";
import {
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
} from "@/lib/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: "Harold Torres Marino" }],
  creator: "Harold Torres Marino",
  publisher: "Harold Torres Marino",
  category: "entertainment",
  alternates: {
    canonical: "/",
  },
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: SITE_URL,
    title: SITE_NAME,
    siteName: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={SITE_LANGUAGE}>
      <body
        className={`${carterOne} ${robotoSlab} antialiased bg-base-100 min-h-screen flex flex-col justify-center items-center py-4`}
      >
        <MovieProvider>
          <Header />
          <main className="mx-auto px-8 flex flex-col items-center w-96">{children}</main>
          <footer className="mx-auto text-center text-sm mt-5"> By Harold Torres</footer>
        </MovieProvider>
      </body>
    </html>
  );
}
