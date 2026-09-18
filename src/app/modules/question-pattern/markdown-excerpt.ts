/** Plain-text excerpt of a markdown explanation for cards and meta tags. */
export function markdownExcerpt(source: string | null | undefined, maxLength = 140): string {
  if (!source) {
    return '';
  }
  const text = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|\W)[*_]([^*_]+)[*_]/g, '$1$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/[|#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > maxLength * 0.5 ? cut.slice(0, lastSpace) : cut}…`;
}
