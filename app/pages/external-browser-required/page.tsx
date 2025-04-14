"use client"
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Define a type extension for Navigator with the standalone property
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export default function ExternalBrowserRequired() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirectUrl, setRedirectUrl] = useState("");

  useEffect(() => {
    // Get the redirect URL from query params
    const redirect = searchParams?.get("redirect") || "/sign-in";
    setRedirectUrl(redirect);

    // Check if we're already in an external browser
    const isStillInAppBrowser = () => {
      const ua = navigator.userAgent;
      
      // Use a proper type check
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
    };

    // If somehow we're already in an external browser, redirect
    if (!isStillInAppBrowser()) {
      router.replace(redirect);
    }
  }, [router, searchParams]);

  const handleOpenBrowser = () => {
    window.open(redirectUrl, "_blank");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">External Browser Required</h1>
      <p className="mb-6">
        For security reasons, Google sign-in cannot be completed in an in-app
        browser. Please open this link in your device&apos;s default browser.
      </p>
      <button
        onClick={handleOpenBrowser}
        className="px-4 py-2 bg-blue-600 text-white rounded-md"
      >
        Open in Browser
      </button>
    </div>
  );
}
