import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RapidCare - Emergency Care, Delivered Fast",
  description: "Access critical medical resources when you need them most. Find and book hospital beds, ICUs, operation theatres, and surgeons in real-time with RapidCare.",
  keywords: "rapidcare, emergency care, hospital, medical, booking, ICU, operation theatre, surgeon, emergency medical resources",
  authors: [{ name: "RapidCare Team" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
