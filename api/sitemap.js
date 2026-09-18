// Vercel serverless dynamic sitemap. Enumerates tags, patterns and sheets
// from the backend so crawlers discover every public page (the static
// public/sitemap.xml cannot list database-driven URLs). Mirrored in
// src/server.ts for the VPS Docker host — keep the two in sync.
const BACKEND = process.env.BACKEND_API_URL || 'https://dsa-drill.duckdns.org/api';
const SITE = 'https://dsa-drill.vercel.app';

const CACHE_TTL_MS = 3600 * 1000;
let cachedXml = null;
let cachedAt = 0;

async function getJson(path) {
  try {
    const response = await fetch(`${BACKEND}${path}`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function tagIdsOf(pattern) {
  if (Array.isArray(pattern.tagIds) && pattern.tagIds.length) {
    return pattern.tagIds;
  }
  return pattern.tagId != null ? [pattern.tagId] : [];
}

function buildSitemap(tags, patterns) {
  const urls = [
    { loc: `${SITE}/home`, priority: '1' },
    { loc: `${SITE}/question-pattern`, priority: '0.9' },
  ];
  for (const tag of tags) {
    if (!tag.slug) {
      continue;
    }
    urls.push({ loc: `${SITE}/question-pattern/${tag.slug}`, priority: '0.8' });
    urls.push({ loc: `${SITE}/problems/${tag.slug}`, priority: '0.8' });
  }
  for (const pattern of patterns) {
    const primary = tagIdsOf(pattern)[0];
    const slug = tags.find((tag) => tag.id === primary)?.slug;
    if (!slug || pattern.id == null) {
      continue;
    }
    urls.push({ loc: `${SITE}/question-pattern/${slug}/${pattern.id}`, priority: '0.7' });
    urls.push({
      loc: `${SITE}/question-pattern/${slug}/${pattern.id}/questions`,
      priority: '0.6',
    });
  }
  const entries = urls
    .map(
      (entry) =>
        `  <url>\n    <loc>${entry.loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

module.exports = async (req, res) => {
  if (!cachedXml || Date.now() - cachedAt > CACHE_TTL_MS) {
    const [tags, patterns] = await Promise.all([
      getJson('/public/problem-tags'),
      getJson('/public/problem-patterns'),
    ]);
    cachedXml = buildSitemap(tags, patterns);
    cachedAt = Date.now();
  }
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(cachedXml);
};
