import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Just Speak - Practice Speaking English 24/7',
  description: 'The app that changes lives, one conversation at a time. Practice speaking English with AI conversation partners anytime, anywhere.',
  keywords: 'English speaking practice, language learning, AI conversation, speaking time tracker',
  authors: [{ name: 'Just Speak Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}