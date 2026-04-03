import type { Metadata } from "next";
import "./globals.css";
import { syne, inter } from "./fonts";
import { MovieProvider } from "@/contexts/MovieContext";
import Header from "@/components/features/Header";
import { Globe, Mail } from "lucide-react";
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
        className={`${syne} ${inter} antialiased bg-base-100 min-h-screen flex flex-col justify-center items-center py-4`}
      >
        <MovieProvider>
          <Header />
          <main className="mx-auto px-8 flex flex-col items-center w-96">{children}</main>
          <footer className="mx-auto text-center mt-8 pb-2 flex flex-col items-center gap-2">
            <p className="text-sm text-base-content/80">By Harold Torres Marino</p>
            <nav aria-label="Social links" className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/in/harold-torres-marino/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-base-content/80 hover:text-primary transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://haroldtorres.dev"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Portfolio website"
                className="text-base-content/80 hover:text-primary transition-colors"
              >
                <Globe size={18} />
              </a>
              <a
                href="https://github.com/codehunt101"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-base-content/80 hover:text-primary transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
              <a
                href="mailto:hello@haroldtorres.dev"
                aria-label="Send email"
                className="text-base-content/80 hover:text-primary transition-colors"
              >
                <Mail size={18} />
              </a>
            </nav>
          </footer>
        </MovieProvider>
      </body>
    </html>
  );
}
