import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

const BACKEND_API_URL = process.env['BACKEND_API_URL'] ?? 'https://dsa-drill.duckdns.org/api';
const SITE_URL = 'https://dsa-drill.vercel.app';
const SITEMAP_TTL_MS = 3600 * 1000;
let cachedSitemap: string | null = null;
let sitemapCachedAt = 0;

async function fetchJsonArray(path: string): Promise<any[]> {
  try {
    const response = await fetch(`${BACKEND_API_URL}${path}`);
    if (!response.ok) {
      return [];
    }
    const data: unknown = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Dynamic sitemap (VPS host). Mirrors api/sitemap.js for Vercel — keep the
 * two in sync. Registered before the static middleware so it wins over the
 * stale public/sitemap.xml for database-driven URLs.
 */
app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    if (!cachedSitemap || Date.now() - sitemapCachedAt > SITEMAP_TTL_MS) {
      const [tags, patterns] = await Promise.all([
        fetchJsonArray('/public/problem-tags'),
        fetchJsonArray('/public/problem-patterns'),
      ]);
      const urls: string[] = [
        `  <url>\n    <loc>${SITE_URL}/home</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1</priority>\n  </url>`,
        `  <url>\n    <loc>${SITE_URL}/question-pattern</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>`,
      ];
      for (const tag of tags) {
        if (!tag?.slug) {
          continue;
        }
        urls.push(
          `  <url>\n    <loc>${SITE_URL}/question-pattern/${tag.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
          `  <url>\n    <loc>${SITE_URL}/problems/${tag.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
        );
      }
      for (const pattern of patterns) {
        const ids: unknown = Array.isArray(pattern?.tagIds)
          ? pattern.tagIds
          : (pattern?.tagId ?? null);
        const primary = Array.isArray(ids) ? ids[0] : ids;
        const slug = tags.find((tag) => tag?.id === primary)?.slug;
        if (!slug || pattern?.id == null) {
          continue;
        }
        urls.push(
          `  <url>\n    <loc>${SITE_URL}/question-pattern/${slug}/${pattern.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
          `  <url>\n    <loc>${SITE_URL}/question-pattern/${slug}/${pattern.id}/questions</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`,
        );
      }
      cachedSitemap =
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
      sitemapCachedAt = Date.now();
    }
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(cachedSitemap);
  } catch (error) {
    next(error);
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
