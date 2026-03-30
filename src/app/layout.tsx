import { Toaster } from 'sonner'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'DN Control System',
  description: 'Gestión de portabilidad de números DN',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f8fafc',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#f8fafc] text-[#374151] antialiased`}>
        {children}
        <Toaster position="top-right" theme="light" richColors />
      </body>
    </html>
  )
}
