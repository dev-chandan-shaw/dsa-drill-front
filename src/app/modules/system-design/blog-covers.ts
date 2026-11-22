const FALLBACKS: { from: string; to: string }[] = [
  { from: '#1e1b4b', to: '#6d28d9' },
  { from: '#083344', to: '#0e7490' },
  { from: '#3f6212', to: '#65a30d' },
  { from: '#7c2d12', to: '#c2410c' },
  { from: '#500724', to: '#9d174d' },
  { from: '#14532d', to: '#16a34a' },
];

function hashIndex(value: string): number {
  let hash = 0;
  for (const ch of value ?? '') {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash % FALLBACKS.length;
}

export function blogGradient(slug: string): string {
  const cover = FALLBACKS[hashIndex(slug)];
  return `linear-gradient(135deg, ${cover.from}, ${cover.to})`;
}

/** Cover image when present, otherwise a deterministic gradient by slug. */
export function blogCoverBackground(
  coverImageUrl: string | null | undefined,
  slug: string,
): string {
  return coverImageUrl
    ? `url('${coverImageUrl}') center / cover no-repeat`
    : blogGradient(slug);
}
