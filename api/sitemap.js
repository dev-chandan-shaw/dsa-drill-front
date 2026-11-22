// Vercel serverless dynamic sitemap. Enumerates tags, patterns and sheets
// from the backend so crawlers discover every public page (the static
// public/sitemap.xml cannot list database-driven URLs). Mirrored in
// src/server.ts for the VPS Docker host — keep the two in sync.
const BACKEND = process.env.BACKEND_API_URL || 'https://dsa-drill.duckdns.org/api';
const SITE = 'https://dsa-drill.vercel.app';
const LIBRARY_CATALOG = [
  { code: 'dsa', sections: [{ code: 'questions' }, { code: 'patterns' }, { code: 'sheets' }] },
  { code: 'lld', sections: [{ code: 'concepts' }, { code: 'case-studies' }] },
  { code: 'hld', sections: [{ code: 'concepts' }, { code: 'case-studies' }] },
];

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

function patternTagIds(pattern) {
  if (Array.isArray(pattern.tagIds) && pattern.tagIds.length) {
    return pattern.tagIds;
  }
  return pattern.tagId != null ? [pattern.tagId] : [];
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]);
}

function buildSitemap(tags, patterns, blogSections, blogPosts, subjects = [], articles = []) {
  if (subjects.length) {
    const urls = [{ path: '/library', priority: '1' }];
    for (const subject of subjects) {
      for (const section of subject.sections ?? []) urls.push({ path: `/library/${subject.code}/${section.code}`, priority: '0.9' });
    }
    for (const article of articles) urls.push({ path: `/library/${article.subject}/${article.section}/${article.slug}`, priority: '0.8' });
    for (const pattern of patterns) if (pattern.slug) urls.push({ path: `/library/dsa/patterns/${pattern.slug}`, priority: '0.8' });
    for (const tag of tags) if (tag.slug) {
      urls.push({ path: `/problems/${tag.slug}`, priority: '0.7' });
      urls.push({ path: `/library/dsa/patterns/topics/${tag.slug}`, priority: '0.7' });
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((entry) => `  <url><loc>${escapeXml(SITE + entry.path)}</loc><changefreq>weekly</changefreq><priority>${entry.priority}</priority></url>`).join('\n')}\n</urlset>`;
  }
  const patternCounts = new Map();
  for (const pattern of patterns) {
    for (const tagId of patternTagIds(pattern)) {
      patternCounts.set(tagId, (patternCounts.get(tagId) ?? 0) + 1);
    }
  }
  const urls = [
    { loc: `${SITE}/home`, priority: '1' },
    { loc: `${SITE}/question-pattern`, priority: '0.9' },
  ];
  for (const tag of tags) {
    if (!tag.slug) {
      continue;
    }
    // Topics without patterns are hidden from the gallery; keep them out
    // of the sitemap too. Pattern and sheet URLs are unaffected.
    if ((patternCounts.get(tag.id) ?? 0) > 0) {
      urls.push({ loc: `${SITE}/question-pattern/${tag.slug}`, priority: '0.8' });
    }
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
  if (blogSections.length || blogPosts.length) {
    urls.push({ loc: `${SITE}/system-design`, priority: '0.9' });
  }
  for (const section of blogSections) {
    if (!section.slug) {
      continue;
    }
    urls.push({ loc: `${SITE}/system-design/${section.slug}`, priority: '0.8' });
  }
  for (const post of blogPosts) {
    if (!post.slug || !post.sectionSlug) {
      continue;
    }
    urls.push({
      loc: `${SITE}/system-design/${post.sectionSlug}/${post.slug}`,
      priority: '0.7',
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
    const [tags, patterns, blogSections, blogPosts, designArticles] = await Promise.all([
      getJson('/public/problem-tags'),
      getJson('/public/problem-patterns'),
      getJson('/public/blog-sections'),
      getJson('/public/blog-posts'),
      getJson('/public/system-design'),
    ]);
    const articles = designArticles.filter(article => article.slug && ['HLD','LLD'].includes(article.level)).map(article => ({
      subject: article.level.toLowerCase(), section: article.kind === 'CONCEPT' ? 'concepts' : 'case-studies', slug: article.slug,
    }));
    cachedXml = buildSitemap(tags, patterns, blogSections, blogPosts, LIBRARY_CATALOG, articles);
    cachedAt = Date.now();
  }
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(cachedXml);
};
