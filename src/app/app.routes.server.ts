import { RenderMode, ServerRoute } from '@angular/ssr';
import { BACKEND_API_URL } from './core/api-origins';

interface ProblemTagDto {
  slug?: string;
}

// Absolute backend origin (shared constant): getPrerenderParams runs in Node
// at build time with no request origin, so the relative '/api' base cannot
// resolve here. Same destination as the /api rewrite in vercel.json.

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
  // Root renders Home (see modules.routes): server-rendered per request so
  // the question + tag lists are always fresh. TransferState carries the
  // server payload to the client — no background refetch needed.
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    path: 'home',
    renderMode: RenderMode.Server,
  },
  {
    // Pattern library: server-rendered per request (like home) so admin
    // edits are visible immediately and crawlers always get full HTML.
    // View-source equivalent of a prerender, without frozen build output.
    path: 'question-pattern',
    renderMode: RenderMode.Server,
  },
  {
    path: 'question-pattern/:tagSlug',
    renderMode: RenderMode.Server,
  },
  {
    path: 'question-pattern/:tagSlug/:patternId',
    renderMode: RenderMode.Server,
  },
  {
    path: 'question-pattern/:tagSlug/:patternId/questions',
    renderMode: RenderMode.Server,
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
