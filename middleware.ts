import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/upload(.*)",
  "/api/upload(.*)",
  "/api/photos/(.*)",
  "/api/user/(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/webhooks/clerk",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/gallery",
  "/api/gallery",
  "/pages/external-browser-required",
]);

const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Check if this is an auth route and potentially in an in-app browser
  if (isAuthRoute(req)) {
    const userAgent = req.headers.get("user-agent") || "";
    const isLikelyInAppBrowser =
      userAgent.includes("Instagram") ||
      userAgent.includes("FBAV") || // Facebook app
      userAgent.includes("FBAN") || // Facebook app
      userAgent.includes("Twitter") ||
      userAgent.includes("TikTok") ||
      userAgent.includes("LinkedIn") ||
      // iOS specific in-app browser detection
      (userAgent.includes("iPhone") &&
        userAgent.includes("AppleWebKit") &&
        !userAgent.includes("CriOS") && // Not Chrome
        !userAgent.includes("FxiOS") && // Not Firefox
        !userAgent.includes("Safari/"));

    if (isLikelyInAppBrowser) {
      // Create the full URL with origin for the redirect parameter
      const currentUrl = new URL(req.url);
      const redirectURL = new URL("/pages/external-browser-required", req.url);
      redirectURL.searchParams.set(
        "redirect",
        currentUrl.pathname + currentUrl.search
      );

      return NextResponse.redirect(redirectURL);
    }
  }

  // If it's a protected route, require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  // For non-public routes that aren't explicitly protected,
  // also require authentication (defensive approach)
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
