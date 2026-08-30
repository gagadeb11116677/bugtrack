import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const sans = Inter({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "bugtrack — lapor bug yuk",
  description: "Catat bug, pantau status, dan kelola laporan dari satu tempat.",
  keywords: ["bug tracker", "lapor bug", "issue tracker", "bugtrack"],
  authors: [{ name: "bugtrack" }],
  manifest: "/manifest.json",
  themeColor: "#dc2626",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "bugtrack" },
  icons: {
    icon: [{ url: "/brand.jpg", type: "image/jpeg" }],
    apple: [{ url: "/brand.jpg", type: "image/jpeg" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3d3530" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}`,
          }}
        />
      </head>
      <body className={`${sans.variable} ${mono.variable} antialiased bg-background text-foreground`}>
        <QueryProvider>
          <ThemeProvider>
            {children}
            <Toaster />
            <SonnerToaster richColors position="top-center" />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
