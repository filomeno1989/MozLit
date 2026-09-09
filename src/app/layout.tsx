import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora, Merriweather, Inter, JetBrains_Mono } from "next/font/google";
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

// Fontes literárias do editor/leitor (com fallback de sistema se offline)
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MozLit - Plataforma Literária Moçambicana",
  description: "Descubra, leia e publique literatura moçambicana. Uma plataforma de leitura, publicação e monetização.",
  keywords: ["MozLit", "literatura", "Moçambique", "livros", "escritores", "leitura"],
  authors: [{ name: "MozLit" }],
  openGraph: {
    title: "MozLit - Plataforma Literária Moçambicana",
    description: "Descubra, leia e publique literatura moçambicana.",
    type: "website",
    images: ["/og-image.png"],
  },
  other: {
    "theme-color": "#d97706",
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
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${merriweather.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}