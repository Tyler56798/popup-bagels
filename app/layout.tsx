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
