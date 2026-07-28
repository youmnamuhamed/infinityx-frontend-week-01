import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TelemetryInit } from "@/core/telemetry/TelemetryInit";
import { WebVitalsInit } from "@/core/telemetry/WebVitalsInit";
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
  title: "Infinity X",
  description: "Infinity X Dashboard",
  icons: {
    icon: "/infinitylogo.webp",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TelemetryInit />
        <WebVitalsInit />
        {children}
      </body>
    </html>
  );
}
