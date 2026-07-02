import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PopUp Bagels — Growth CRM",
  description: "Office-building outreach pipeline for PopUp Bagels Chicago",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PopUp CRM",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Exporting a custom viewport replaces Next's defaults entirely, so
  // width/initialScale must be restated or iOS falls back to a 980px
  // legacy viewport and zooms pages to their content width.
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom disabled: this runs as an installed app and zooming breaks
  // the fixed chrome (header/tab bar) illusion.
  maximumScale: 1,
  userScalable: false,
  // Matches the chrome gray so the iOS/Android status bar blends with the app.
  themeColor: "#f6f7fb",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>{children}</body>
    </html>
  );
}
