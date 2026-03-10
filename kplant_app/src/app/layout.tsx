import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kplant — Monitoreo inteligente de tus plantas",
  description: "Monitorea la humedad, luz y temperatura de tus plantas en tiempo real.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kplant",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#2D6A4F" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.variable} ${fraunces.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
