import type { Metadata } from "next"
import { Inter, Titan_One } from "next/font/google"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const titanOne = Titan_One({
  variable: "--font-titan-one",
  weight: "400",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Kittypau",
  description: "Monitoreo inteligente para tu mascota",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${titanOne.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
