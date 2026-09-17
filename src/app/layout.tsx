import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--font-press",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const vt323 = VT323({
  variable: "--font-vt",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  // Only the admin inputs use this face, so preloading it on the home page
  // triggers "preloaded but not used" warnings.
  preload: false,
});

const SITE_URL = "https://sybimeta.xyz";
const SITE_TITLE = "Sybi";
const SITE_DESCRIPTION =
  "⚡️ Digital liberator\n💊 Reality architect\nCoding the escape route from the system 🕳️";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: "/profile.png",
    shortcut: "/profile.png",
    apple: "/profile.png",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_TITLE,
    images: [
      {
        url: "/profile.png",
        width: 800,
        height: 800,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/profile.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${vt323.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-void">{children}</body>
    </html>
  );
}
