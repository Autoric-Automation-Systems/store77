import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Store77 — gestão de estoque para lojas",
    template: "%s · Store77",
  },
  description:
    "Controle de estoque, caixa, financeiro e vitrine online para lojas físicas e e-commerce.",
  applicationName: "Store77",
  manifest: "/favicon_io/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      {
        url: "/favicon_io/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: "/favicon_io/favicon.ico",
    apple: "/favicon_io/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
