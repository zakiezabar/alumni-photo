"use client";
import Link from "next/link";
import { Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SignedOut, useAuth } from "@clerk/nextjs";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";

import { useRef } from "react";

import { Confetti, type ConfettiRef } from "@/components/magicui/confetti";

export default function Home() {
  const { isSignedIn } = useAuth();
  const confettiRef = useRef<ConfettiRef>(null);

  return (
    <div className="h-screen flex items-center pt-24 flex-col gap-8 w-full lg:w-[500px]">
      <div className="relative w-62 h-62">
        <Image
          src="/images/group-photo.jpeg"
          fill
          alt="silhouette graduation"
          className="rounded-full object-cover border-2 border-primary-400"
        />
      </div>
      <div className="text-xl text-mono-200 text-center">
        Capture. Upload. Relive the Moments.
      </div>
      
      <div className="flex flex-col gap-4 w-full">
        {!isSignedIn && (
          <SignedOut>
            <Link href="/signin">
              <Button
                variant="outline"
                className="w-full flex flex-row gap-2 items-center border-2 border-slate-100 bg-white p-6 rounded-lg text-mono-800"
              >
                <FcGoogle className="w-6 h-6" />
                <div className="text-md">Login using google</div>
              </Button>
            </Link>
          </SignedOut>
        )}
        {isSignedIn && (
          <Link href="/upload">
            <Button variant="primary" size="lg" className="w-full">
              <Camera className="w-16 h-16" /> Upload photos
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
        Whether it’s a group hug, a candid smile, or a throwback vibe — share
        your photos from today’s event and see them come to life on the
        big screen. Every memory matters.
      </div>
    </div>
  );
}
