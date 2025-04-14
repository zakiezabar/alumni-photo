"use client"
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ExternalBrowserRequired() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullUrl, setFullUrl] = useState("");

  useEffect(() => {
    // Get the redirect URL from query params
    const redirect = searchParams?.get("redirect") || "/sign-in";
    
    // Store the full URL including origin
    setFullUrl(`${window.location.origin}${redirect}`);

    // Check if we're already in an external browser (more robust check)
    const isStillInAppBrowser = () => {
      const ua = navigator.userAgent;
      
      // More comprehensive check without unused variables
      return (
        ua.includes('Instagram') || 
        ua.includes('FBAV') || 
        ua.includes('FBAN') ||
        ua.includes('Twitter') ||
        ua.includes('LinkedInApp') ||
        ua.includes('TikTok') ||
        // iOS specific in-app browser detection
        (ua.includes('iPhone') && 
         ua.includes('AppleWebKit') && 
         !ua.includes('CriOS') && 
         !ua.includes('FxiOS') && 
         !ua.includes('Safari/'))
      );
    };

    // If somehow we're already in an external browser, redirect
    if (!isStillInAppBrowser()) {
      router.replace(redirect);
    }
  }, [router, searchParams]);

  // Multiple methods to try to open external browser
  const handleOpenBrowser = () => {
    // Method 1: window.open
    window.open(fullUrl, "_blank");
    
    // Method 2: Create and click a link
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = fullUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 300);
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
        className="px-4 py-2 bg-blue-600 text-white rounded-md mb-4"
      >
        Open in Browser
      </button>
      
      {/* Add a manual fallback option */}
      <div className="mt-4 p-4 bg-gray-100 rounded-md max-w-md">
        <p className="text-sm text-gray-700 mb-2">
          If the button doesn&apos;t work, copy this URL and paste it in your browser:
        </p>
        <div className="p-2 bg-white rounded border mt-2 text-xs break-all">
          {fullUrl}
        </div>
      </div>
    </div>
  );
}