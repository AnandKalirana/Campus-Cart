import "./globals.css"; // first: declares the cascade-layer order
import type { Metadata } from "next";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@/lib/theme";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Marquee } from "@/components/layout/marquee";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "Campus Cart — Less spending. More living.", template: "%s · Campus Cart" },
  description:
    "Buy and sell pre-loved essentials with verified students nearby. Local pickup, zero shipping, free listings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased" style={{ colorScheme: "light" }}>
      <body className="min-h-screen">
        <Theme theme={neutralTheme} mode="light">
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border-4 focus:border-black focus:bg-cc-yellow focus:px-4 focus:py-2 focus:font-bold focus:text-black">
            Skip to content
          </a>
          <Providers>
            <div aria-hidden className="grain" />
            <Marquee />
            <Header />
            <main id="main">{children}</main>
            <Footer />
          </Providers>
        </Theme>
      </body>
    </html>
  );
}
