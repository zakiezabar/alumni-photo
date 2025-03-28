import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import { ClerkLoaded, ClerkLoading, ClerkProvider } from "@clerk/nextjs";
// import Navbar from "@/components/Navbar";
import Navigation from "@/components/Navigation";
import { Camera } from "lucide-react";
import { HyperText } from "@/components/magicui/hyper-text";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"], // Specify weights if needed
  variable: "--font-space-mono", // Optional CSS variable for custom use
});

export const metadata: Metadata = {
  title: "Share moments",
  description: "Capture. Upload. Relive the moments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl={"/"}>
      <html lang="en">
        <body className={spaceMono.className}>
          <ClerkLoading>
            <div className="h-screen flex flex-row gap-4 items-center text-sm justify-center font-mono p-4 bg-primary-400">
              <Camera className="w-12 h-12 animate-spin" />
              <HyperText>Loading...</HyperText>
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <Navigation />
            <div className="min-h-screen block md:flex justify-center w-full p-4 bg-secondary-800">{children}</div>
          </ClerkLoaded>
        </body>
      </html>
    </ClerkProvider>
  );
}
