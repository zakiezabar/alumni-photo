"use client";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedOut, useAuth } from "@clerk/nextjs";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Confetti, type ConfettiRef } from "@/components/magicui/confetti";
import { Space_Mono } from "next/font/google";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

// Define type for standalone property
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export default function Home() {
  const { isSignedIn } = useAuth();
  const confettiRef = useRef<ConfettiRef>(null);
  const router = useRouter();

  // Function to detect in-app browsers
  const isInAppBrowser = useCallback(() => {
    const ua = navigator.userAgent;
    const nav = navigator as NavigatorWithStandalone;
    const isStandalone = 'standalone' in navigator ? nav.standalone : undefined;
    
    return (
      ua.includes('Instagram') || 
      ua.includes('FBAV') || 
      ua.includes('Twitter') ||
      ua.includes('LinkedInApp') ||
      (isStandalone === undefined && 
       ua.includes('Mobile') && 
       !ua.includes('Safari') &&
       !ua.includes('Chrome'))
    );
  }, []);

  // Handle sign-in button click
  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isInAppBrowser()) {
      // Redirect to the external browser page with signin as the redirect destination
      router.push('/pages/external-browser-required?redirect=/sign-in');
    } else {
      // Continue to signin page normally
      router.push('/sign-in');
    }
  };

  return (
    <div className="flex items-center pt-24 flex-col gap-8 w-full lg:w-[500px]">
      <div className="relative w-62 h-62">
        <Image
          src="/images/graduate-02.png"
          fill
          alt="silhouette graduation"
          className="rounded-full object-cover border-2 border-primary-400"
        />
      </div>
      <div className={`${spaceMono.className} text-xl text-mono-200 text-center`}>
        Capture. Upload. Relive the Moments.
      </div>
      
      <div className="flex flex-col gap-4 w-full">
        {!isSignedIn && (
          <SignedOut>
            {/* Replace Link with button that has custom handler */}
            <Button
              variant="outline"
              className="w-full flex flex-row gap-2 items-center border-2 border-slate-100 bg-white p-6 rounded-lg text-mono-800"
              onClick={handleSignInClick}
            >
              <FcGoogle className="w-6 h-6" />
              <div className="text-md">Login using google</div>
            </Button>
          </SignedOut>
        )}
        {isSignedIn && (
          <Link href="/upload">
            <Button variant="primary" size="lg" className="w-full font-bold">
              <Camera className="size-6" /> Upload photos
            </Button>
            <Confetti
              ref={confettiRef}
              className="absolute left-0 top-0 z-0 size-full"
              onMouseEnter={() => {
                confettiRef.current?.fire({});
              }}
            />
          </Link>
        )}
      </div>
      <div className="text-sm text-mono-200 text-center">
        Whether it&apos;s a group hug, a candid smile, or a throwback vibe — share
        your photos from today&apos;s event and see them come to life on the
        big screen. Every memory matters.
      </div>
    </div>
  );
}