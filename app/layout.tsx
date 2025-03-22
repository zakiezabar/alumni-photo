import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import { ClerkLoaded, ClerkLoading, ClerkProvider } from "@clerk/nextjs";
// import Navbar from "@/components/Navbar";
import Navigation from "@/components/Navigation";

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'], // Specify weights if needed
  variable: '--font-space-mono', // Optional CSS variable for custom use
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl={"/"}
    >
      <html lang="en">
        <body
          className={spaceMono.className}
        >
          <ClerkLoading>
            <Navigation />
            <div className="min-h-screen py-6">
              Loading...
            </div>            
          </ClerkLoading>
          <ClerkLoaded>
            <Navigation />  
            <div className="min-h-screen py-6">
              {children}
            </div>
          </ClerkLoaded>
        </body>
      </html>
    </ClerkProvider>
  );
}
