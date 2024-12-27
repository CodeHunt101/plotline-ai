import type { Metadata } from 'next'
import './globals.css'
import { carterOne, robotoSlab } from './fonts'
import { MovieProvider } from '@/contexts/MovieContext'
import Header from '@/components/features/Header'

export const metadata: Metadata = {
  title: 'PlotlineAI',
  description:
    "A Next.js-powered movie recommendation app that helps groups find the perfect movie for their next watch party. PlotlineAI uses AI to analyse each participant's movie preferences and suggests films that everyone will enjoy.",
  authors: [{ name: 'Harold Torres Marino' }],
  creator: 'Harold Torres Marino',
  publisher: 'Harold Torres Marino',
  metadataBase: new URL('https://plotline-ai.pages.dev'),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${carterOne} ${robotoSlab} antialiased bg-base-100 min-h-screen flex flex-col justify-center items-center py-4`}
      >
        <MovieProvider>
          <Header />
          <main className="mx-auto px-8 flex flex-col items-center w-96">
            {children}
          </main>
          <footer className="mx-auto text-center text-sm mt-5">
            {' '}
            By Harold Torres
          </footer>
        </MovieProvider>
      </body>
    </html>
  )
}
