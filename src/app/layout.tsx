import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lora, Merriweather, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import RegistrarServiceWorker from "@/components/literaria/RegistrarServiceWorker";

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
  metadataBase: new URL("https://mozlit.vercel.app"),
  title: "MozLit - Plataforma Literária Moçambicana",
  description: "Descubra, leia e publique literatura moçambicana. Uma plataforma de leitura, publicação e monetização.",
  keywords: ["MozLit", "literatura", "Moçambique", "livros", "escritores", "leitura"],
  authors: [{ name: "MozLit" }],
  openGraph: {
    title: "MozLit - Plataforma Literária Moçambicana",
    description: "Descubra, leia e publique literatura moçambicana.",
    type: "website",
    siteName: "MozLit",
    locale: "pt_MZ",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "MozLit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MozLit - Plataforma Literária Moçambicana",
    description: "Descubra, leia e publique literatura moçambicana.",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MozLit",
  },
  manifest: "/manifest.webmanifest",
};

/**
 * Safe-areas iOS (item 23): viewport-fit=cover permite o conteúdo esticar-se
 * até às bordas do ecrã (pago/entalhe), e os utilitários pt-safe/pb-safe no
 * header/footer/leitor empurram o conteúdo para fora das zonas seguras.
 * appleWebApp completa a sensação de app quando instalado no iPhone/iPad.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d97706",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        {/*
          Anti-flash de tema: aplica claro/escuro ANTES do primeiro paint.
          Sem isto, quem usa modo escuro via uma luz branca em cada carregamento —
          sensação de app amador. O script é minúsculo e roda no <head>.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var g=localStorage.getItem('mozlit_dark');var e=g===null?window.matchMedia('(prefers-color-scheme: dark)').matches:g==='true';if(e)document.documentElement.classList.add('dark');}catch(x){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${merriweather.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}