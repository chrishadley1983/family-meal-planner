import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "familyFuel",
  description: "AI-powered family meal planning with smart recipes, macro tracking, and intelligent shopping lists",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
