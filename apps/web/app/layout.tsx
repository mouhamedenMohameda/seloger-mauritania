import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SeLoger Mauritania',
  description: 'Real Estate Marketplace for Mauritania',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavBar />
        <main className="pt-14 min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}
