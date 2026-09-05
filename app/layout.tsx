import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PerformanceProbe from "./components/performance-probe";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PeerGrid — The verified NST student network",
    template: "%s · PeerGrid",
  },
  description:
    "Discover and connect with verified NST students by campus, skills, interests, projects, and goals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}{process.env.PEERGRID_PERF_AUDIT === "1" && <PerformanceProbe />}</body>
    </html>
  );
}
