import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/upload(.*)',
  '/api/upload(.*)',
  '/api/photos/(.*)',
  '/api/user/(.*)',
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/api/webhooks/clerk',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/gallery',
  '/api/gallery',
])

export default clerkMiddleware(async (auth, req) => {
  // If it's a protected route, require authentication
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
  // For non-public routes that aren't explicitly protected,
  // also require authentication (defensive approach)
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}