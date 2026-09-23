import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APEX — F1 Dashboard",
  description: "Formula 1 dashboard for the 2026 season",
  // Safari's own tags, mirroring the manifest. iOS reads these for the
  // home-screen title and the status bar above the app.
  appleWebApp: {
    capable: true,
    title: "APEX",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#060608",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}
