import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Body & headings fallback. On Apple devices the system stack renders SF Pro
// (see globals.css --font-sans / --font-heading); Inter is the bundled,
// cross-platform fallback for everyone else. SF Pro itself can't be bundled
// (Apple licensing), so it's referenced via -apple-system only.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Mono — for QR ids and other monospaced snippets.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Locana - Loyalty App",
    template: "%s | Locana",
  },
  description:
    "Locana adalah aplikasi loyalty digital berbasis QR untuk cafe. Kumpulkan stamp, dapatkan reward!",
  keywords: ["loyalty", "cafe", "qr code", "stamp", "reward"],
  icons: {
    icon: "/logoApps.png",
    apple: "/logoApps.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster richColors position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
