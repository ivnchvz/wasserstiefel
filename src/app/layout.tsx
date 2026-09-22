import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const DESCRIPTION = "An insight: the films, games, series, books and music I've been into, and what I write.";

export const metadata: Metadata = {
  // Resolves the share image and canonical links to absolute URLs.
  metadataBase: new URL(SITE_URL),
  title: "wasserstiefel",
  description: DESCRIPTION,
  openGraph: { title: "wasserstiefel", description: DESCRIPTION, siteName: "wasserstiefel", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The script below sets data-theme, which the server can't predict.
    <html lang="en" className={`${plexMono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/*
         * Applies a saved theme before anything paints. Rendered inline and
         * run first: loading it later would show the wrong palette for a
         * frame, which is worse than the cost of a few bytes here.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
