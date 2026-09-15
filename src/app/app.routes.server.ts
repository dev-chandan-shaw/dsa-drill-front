import { RenderMode, ServerRoute } from '@angular/ssr';

interface ProblemTagDto {
  slug?: string;
}

// Absolute backend origin: getPrerenderParams runs in Node at build time
// with no request origin, so the relative '/api' base cannot resolve here.
// Same destination as the /api rewrite in vercel.json.
const BACKEND_API_URL = 'https://dsa-drill.duckdns.org/api';

// Tag slugs for prerendering public sheet pages. Runs at build time against
// the production API; on any failure returns [] so those URLs fall back to
// the client-side shell at runtime instead of failing the build.
async function getProblemTagParams(): Promise<{ sheetId: string }[]> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/public/problem-tags`);
    if (!response.ok) {
      return [];
    }
    const tags = (await response.json()) as ProblemTagDto[];
    return tags
      .filter((tag) => !!tag.slug)
      .map((tag) => ({ sheetId: tag.slug as string }));
  } catch {
    return [];
  }
}

export const serverRoutes: ServerRoute[] = [
  // Root renders Home (see modules.routes): prerendered for first paint/SEO
  // and doubles as the SPA fallback shell content.
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'home',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'question-pattern',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'register',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'signup',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'problems/:sheetId',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: getProblemTagParams,
  },
  {
    path: 'problems-sheet/:sheetId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
