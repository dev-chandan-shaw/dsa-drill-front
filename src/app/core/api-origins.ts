/**
 * Shared origins.
 *
 * BACKEND_API_ORIGIN is the absolute backend origin used only where a
 * relative '/api' base cannot resolve: Node at build/prerender time and
 * server-side HttpClient calls (no request origin). Browser code keeps the
 * relative base so it rides the same-origin Vercel proxy (first-party
 * cookies, no CORS preflights).
 *
 * SITE_URL is the canonical public origin of the frontend (see
 * public/sitemap.xml + robots.txt). Used for og:url / canonical tags.
 */
export const BACKEND_API_ORIGIN = 'https://dsa-drill.duckdns.org';
export const BACKEND_API_URL = `${BACKEND_API_ORIGIN}/api`;
export const SITE_URL = 'https://dsa-drill.vercel.app';
