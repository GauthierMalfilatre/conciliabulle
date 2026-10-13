import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Footer, Header, InfoBanner } from "@/components/layout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { template: "%s · Justice Tech", default: "Justice Tech" },
  description: "Trouvez un conciliateur près de chez vous et prenez rendez-vous en ligne.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <Suspense>
          <InfoBanner />
        </Suspense>
        <main id="contenu" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
