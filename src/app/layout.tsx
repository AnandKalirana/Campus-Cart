import "./globals.css"; // first: declares the cascade-layer order
import type { Metadata } from "next";
import { Theme } from "@astryxdesign/core/theme";
import { themes, defaultThemeSlug } from "@/astryx-themes";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: { default: "Campus Cart — Less spending. More living.", template: "%s · Campus Cart" },
  description:
    "Buy and sell pre-loved essentials with verified students nearby. Local pickup, zero shipping, free listings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen">
        <Theme theme={themes[defaultThemeSlug]}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-cc-ink focus:px-4 focus:py-2 focus:text-white">
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </Theme>
      </body>
    </html>
  );
}
