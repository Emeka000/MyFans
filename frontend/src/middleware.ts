import { NextResponse, type NextRequest } from 'next/server';

/**
 * Demo / storybook-style routes that must not be reachable in a production
 * build. They leak in-progress components, confuse SEO, and widen the
 * attack surface (e.g. `/error-test` deliberately throws).
 *
 * They stay available when `NODE_ENV === 'development'` or when the deploy
 * explicitly opts in with `FLAG_DEMOS=true` (e.g. a preview environment).
 * Everywhere else they 404 and are marked `noindex`.
 *
 * See MyFanss/MyFans#1596 and docs/DEMO_ROUTES.md.
 */
export const DEMO_ROUTE_PREFIXES = [
  '/wallet-demo',
  '/error-test',
  '/ui',
  '/subscribe-example',
  '/settings-demo',
  '/pending',
] as const;

function isDemoPath(pathname: string): boolean {
  return DEMO_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function demosEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'development' || env.FLAG_DEMOS === 'true';
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (!isDemoPath(pathname)) {
    return NextResponse.next();
  }

  if (!demosEnabled()) {
    // Rewrite to a non-existent path so Next renders its 404 page with a
    // real 404 status instead of serving the demo component.
    const notFoundUrl = new URL('/_demo-route-disabled', request.url);
    const res = NextResponse.rewrite(notFoundUrl, { status: 404 });
    res.headers.set('x-robots-tag', 'noindex, nofollow');
    return res;
  }

  // Demos allowed (dev / preview) — still keep them out of search indexes.
  const res = NextResponse.next();
  res.headers.set('x-robots-tag', 'noindex, nofollow');
  return res;
}

export const config = {
  matcher: [
    '/wallet-demo/:path*',
    '/error-test/:path*',
    '/ui/:path*',
    '/subscribe-example/:path*',
    '/settings-demo/:path*',
    '/pending/:path*',
  ],
};
