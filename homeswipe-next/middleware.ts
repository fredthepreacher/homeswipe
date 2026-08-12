import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Everything is protected by default. Add routes here only when they must be
// reachable without a session.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/healthz",
]);

const isApiRoute = createRouteMatcher(["/api/(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  if (isApiRoute(request)) {
    // auth.protect() answers unauthenticated API calls with a 404 HTML page so
    // it does not leak which routes exist. That breaks the client: apiFetch()
    // in lib/*-api.ts parses the body as JSON and surfaces `error`. Return the
    // same 401 JSON shape the route handlers use instead.
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jinja2|txt|xml|ico|webp|avif|jpg|jpeg|gif|svg|ttf|woff2?|eot|otf|map|json|wasm)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
