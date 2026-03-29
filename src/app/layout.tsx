import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/query-client";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrendBot — Instagram Content Intelligence",
  description: "AI-powered Instagram trend analysis and content creation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ReactQueryProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
