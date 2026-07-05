import type { Metadata } from "next";
import { Poppins, Roboto, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Headings / brand — geometric, friendly, distinctive at large sizes.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Body / UI — tuned for legibility at small sizes (labels, tables, buttons).
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
      className={`${poppins.variable} ${roboto.variable} ${geistMono.variable} h-full antialiased`}
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
