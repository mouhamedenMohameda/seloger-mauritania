import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import Providers from '@/components/Providers'
import { ToastContainer } from '@/lib/toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'raDar',
  description: 'Trouvez votre futur foyer en Mauritanie / اعثر على منزلك المستقبلي في موريتانيا',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <NavBar />
          <main className="pt-24 md:pt-28 min-h-screen bg-gray-50">
            {children}
          </main>
          <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
