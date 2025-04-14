import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server'

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
  '/external-browser-required',
]);

const isAuthRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Check if this is an auth route and potentially in an in-app browser
  if (isAuthRoute(req)) {
    const userAgent = req.headers.get("user-agent") || "";
    const isLikelyInAppBrowser =
      userAgent.includes("Instagram") ||
      userAgent.includes("FBAV") || // Facebook
      userAgent.includes("Twitter") ||
      userAgent.includes("LinkedInApp") ||
      // Add other common in-app browser identifiers
      (userAgent.includes("Mobile") &&
        !userAgent.includes("Safari") &&
        !userAgent.includes("Chrome"));

    if (isLikelyInAppBrowser) {
      // Redirect to a page that will handle opening in external browser
      const url = new URL("/external-browser-required", req.url);
      // Preserve the original destination
      url.searchParams.set("redirect", req.url);
      return NextResponse.redirect(url);
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
