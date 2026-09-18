export interface TopicCover {
  /** Gradient endpoints (deep jewel tones — identical in both themes). */
  from: string;
  to: string;
  /** Oversized translucent data-structure glyph, JetBrains Mono. */
  glyph: string;
}

/** Minimal tag shape needed to resolve a cover. */
export interface TagCoverSource {
  slug: string;
  name: string;
  coverFrom?: string | null;
  coverTo?: string | null;
  coverGlyph?: string | null;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const CURATED: Record<string, TopicCover> = {
  arrays: { from: '#1e3a8a', to: '#0284c7', glyph: '[]' },
  strings: { from: '#6b21a8', to: '#c026d3', glyph: '{}' },
  'linked-list': { from: '#065f46', to: '#0d9488', glyph: 'o→o' },
  stack: { from: '#7c2d12', to: '#ea580c', glyph: '≡' },
  queue: { from: '#134e4a', to: '#10b981', glyph: '≣' },
  heap: { from: '#1e1b4b', to: '#7c3aed', glyph: '⟁' },
  'hashmap': { from: '#78350f', to: '#d97706', glyph: '#' },
  'hash-table': { from: '#78350f', to: '#d97706', glyph: '#' },
  trees: { from: '#14532d', to: '#16a34a', glyph: 'Y' },
  graphs: { from: '#0c4a6e', to: '#06b6d4', glyph: '◈' },
  tries: { from: '#3b0764', to: '#a21caf', glyph: 'T' },
  'dynamic-programming': { from: '#111827', to: '#4f46e5', glyph: '01' },
  dp: { from: '#111827', to: '#4f46e5', glyph: '01' },
  recursion: { from: '#500724', to: '#e11d48', glyph: '( )' },
  sorting: { from: '#082f49', to: '#0891b2', glyph: '↑' },
  searching: { from: '#082f49', to: '#0891b2', glyph: '?' },
  'binary-search': { from: '#082f49', to: '#0891b2', glyph: '÷' },
  greedy: { from: '#431407', to: '#f59e0b', glyph: '⚡' },
  backtracking: { from: '#3f3f46', to: '#a1a1aa', glyph: '↩' },
  'bit-manipulation': { from: '#172554', to: '#38bdf8', glyph: '01' },
  math: { from: '#422006', to: '#ca8a04', glyph: '∑' },
  intervals: { from: '#064e3b', to: '#34d399', glyph: '[)' },
  'two-pointers': { from: '#4c1d95', to: '#8b5cf6', glyph: '⇄' },
  'sliding-window': { from: '#0f172a', to: '#0ea5e9', glyph: '▭' },
};

const FALLBACKS: TopicCover[] = [
  { from: '#1e1b4b', to: '#6d28d9', glyph: '◇' },
  { from: '#083344', to: '#0e7490', glyph: '∴' },
  { from: '#3f6212', to: '#65a30d', glyph: '∞' },
  { from: '#7c2d12', to: '#c2410c', glyph: 'λ' },
  { from: '#500724', to: '#9d174d', glyph: '△' },
];

/** Swatch palette offered in the admin tag picker. */
export const COVER_SWATCHES: { from: string; to: string }[] = [
  { from: '#1e3a8a', to: '#0284c7' },
  { from: '#6b21a8', to: '#c026d3' },
  { from: '#065f46', to: '#0d9488' },
  { from: '#7c2d12', to: '#ea580c' },
  { from: '#14532d', to: '#16a34a' },
  { from: '#0c4a6e', to: '#06b6d4' },
  { from: '#500724', to: '#e11d48' },
  { from: '#111827', to: '#4f46e5' },
];

/** Initials monogram, e.g. "Binary Search Tree" → "BS". */
export function tagInitials(name: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return '?';
  }
  return ((words[0][0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase();
}

function hashIndex(slug: string): number {
  let hash = 0;
  for (const ch of slug ?? '') {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash % FALLBACKS.length;
}

/** Curated cover per topic slug; deterministic fallback so new tags never look broken. */
export function topicCover(slug: string): TopicCover {
  return resolveTopicCover({ slug, name: slug });
}

/**
 * Full resolution order: admin-curated values (when both colors are valid
 * hex) win, then the curated map, then a monogram cover (tag initials over
 * a hash-picked gradient) so runtime-added tags always look intentional.
 */
export function resolveTopicCover(tag: TagCoverSource): TopicCover {
  const from = tag.coverFrom?.trim() ?? '';
  const to = tag.coverTo?.trim() ?? '';
  if (HEX_COLOR.test(from) && HEX_COLOR.test(to)) {
    return { from, to, glyph: tag.coverGlyph?.trim() || tagInitials(tag.name) };
  }
  const slug = (tag.slug ?? '').toLowerCase();
  if (CURATED[slug]) {
    return CURATED[slug];
  }
  const fallback = FALLBACKS[hashIndex(tag.slug ?? '')];
  return { ...fallback, glyph: tagInitials(tag.name) };
}
