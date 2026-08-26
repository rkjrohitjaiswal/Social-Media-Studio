import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const serifFont = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const sansFont = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Social Media Studio — AI Social Media Content Engine",
  description: "Transform 1 reference aesthetic into 100 high-performance social posts with AI visual generation, editorial copy, quality grading, and automated publishing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${serifFont.variable} ${sansFont.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b0c0e] text-[#f5f4f0] selection:bg-[#c5a059] selection:text-black">
        {children}
      </body>
    </html>
  );
}
