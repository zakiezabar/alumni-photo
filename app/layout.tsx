import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { ClerkLoaded, ClerkLoading, ClerkProvider } from "@clerk/nextjs";
// import Navbar from "@/components/Navbar";
import Navigation from "@/components/Navigation";
import { Camera } from "lucide-react";
import { HyperText } from "@/components/magicui/hyper-text";
import { ToastProvider } from "@/components/ui/use-toast";
import Footer from "@/components/Footer";

// const spaceMono = Space_Mono({
//   subsets: ["latin"],
//   weight: ["400", "700"], // Specify weights if needed
//   variable: "--font-space-mono", // Optional CSS variable for custom use
// });

const font = Nunito_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "50th Anniversary of UITM Interior Design Program",
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
        <body className={font.className}>
          <ClerkLoading>
            <div className="h-screen flex flex-row gap-4 items-center text-sm justify-center font-mono p-4 bg-primary-400">
              <Camera className="w-12 h-12 animate-spin" />
              <HyperText>Loading...</HyperText>
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <Navigation />
            <ToastProvider>
              <div className="min-h-screen block md:flex justify-center w-full p-4 bg-secondary-800">
                {children}
                <Footer />
              </div>
            </ToastProvider>
          </ClerkLoaded>
        </body>
      </html>
    </ClerkProvider>
  );
}
