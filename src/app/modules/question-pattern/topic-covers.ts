export interface TopicCover {
  /** Gradient endpoints (deep jewel tones — identical in both themes). */
  from: string;
  to: string;
  /** Oversized translucent data-structure glyph, JetBrains Mono. */
  glyph: string;
}

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

/** Curated cover per topic slug; deterministic fallback so new tags never look broken. */
export function topicCover(slug: string): TopicCover {
  const hit = CURATED[(slug ?? '').toLowerCase()];
  if (hit) {
    return hit;
  }
  let hash = 0;
  for (const ch of slug ?? '') {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return FALLBACKS[hash % FALLBACKS.length];
}
