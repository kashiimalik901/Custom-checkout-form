import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'ENGEL-TRANS - Professional Towing & Transport Services',
  description: 'TOWING AND TRANSFERRING CARS/TRUCKS 5T – CONTACT: 996-238 8338',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        {children}
        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={5000}
        />
      </body>
    </html>
  )
}
