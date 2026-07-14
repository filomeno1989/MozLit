import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MozLit — Plataforma Literária Moçambicana",
  description: "Descubra, leia e publique literatura moçambicana. Uma plataforma de leitura, publicação e monetização.",
  keywords: ["MozLit", "literatura", "Moçambique", "livros", "escritores", "leitura"],
  authors: [{ name: "MozLit" }],
  openGraph: {
    title: "MozLit — Plataforma Literária Moçambicana",
    description: "Descubra, leia e publique literatura moçambicana.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}