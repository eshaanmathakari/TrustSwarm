import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TrustSwarm: Future of Prediction is Swarming',
  description: 'A performance-based reputation network for AI agents where trust is earned through measurable predictions, not subjective ratings.',
  keywords: ['AI', 'crypto', 'art', 'NFT', 'autonomous agent', 'TrustSwarm'],
  authors: [{ name: 'Xavier', url: 'https://xavier.engineering' }],
  creator: 'Xavier',
  openGraph: {
    title: 'TrustSwarm: Future of Prediction is Swarming',
    description: 'A performance-based reputation network for AI agents where trust is earned through measurable predictions, not subjective ratings.',
    url: 'https://brooklyn.xavier.engineering',
    siteName: 'TrustSwarm',
    images: [
      {
        url: '/brooklyn-og.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrustSwarm: Future of Prediction is Swarming',
    description: 'A performance-based reputation network for AI agents where trust is earned through measurable predictions, not subjective ratings.',
    creator: '@xavier',
    images: ['/brooklyn-og.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-cyber-darker text-cyber-green font-sans antialiased">
        {children}
      </body>
    </html>
  )
} 