import { Injectable } from '@angular/core';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const CODE_CLASS_PATTERN = /^language-[\w-]+$/;

/**
 * Renders user-authored markdown to XSS-safe HTML (pure GFM, like GitHub).
 * Isomorphic by design: sanitize-html runs identically on the server and in
 * the browser, so SSR emits the same explanation HTML that crawlers and
 * hydration see — no client-only rendering gaps.
 */
@Injectable({
  providedIn: 'root',
})
export class MarkdownService {
  render(content: string | null | undefined, article = false): string {
    const source = content ?? '';
    if (!source.trim()) {
      return '';
    }
    const html = marked.parse(source, { gfm: true }) as string;
    
    const compact = html.replace(/>\s*\n\s*</g, '><');
    return sanitizeHtml(compact, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'img',
        'input',
        'del',
        'h1',
        'h2',
      ]),
      allowedAttributes: {
        // Transformed-in attributes (target/rel, class) must also be listed
        // here: sanitize-html filters attributes after running transformTags.
        a: ['href', 'title', 'target', 'rel'],
        code: ['class'],
        img: ['src', 'alt', 'title', 'loading'],
        input: ['type', 'checked', 'disabled'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowProtocolRelative: false,
      transformTags: {
        // Links always open elsewhere; never in the app tab.
        a: (tagName, attribs): sanitizeHtml.Tag => ({
          tagName,
          attribs: article && (attribs['href']?.startsWith('#') || /^\/(?!\/)/.test(attribs['href'] ?? ''))
            ? attribs : { ...attribs, target: '_blank', rel: 'noopener' },
        }),
        // Keep syntax-language hints for the highlighter, drop anything else.
        code: (tagName, attribs): sanitizeHtml.Tag => {
          const cls = attribs['class'] ?? '';
          return {
            tagName,
            attribs: CODE_CLASS_PATTERN.test(cls) ? { class: cls } : {},
          };
        },
      },
    });
  }

  /** Generated anchors work identically in SSR, preview, and the public reader. */
  renderArticle(content: string) {
    const headings: { id: string; text: string; level: number }[] = [];
    const used = new Map<string, number>();
    const html = this.render(content, true).replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_match, level: string, body: string) => {
      const text = body.replace(/<[^>]*>/g, '')
        .replace(/&#(\d+);/g, (_: string, n: string) => String.fromCodePoint(Number(n)))
        .replace(/&(?:amp|lt|gt|quot|#39);/g, (entity: string) =>
          ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[entity] ?? entity);
      const base = 'section-' + (text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'heading');
      const count = used.get(base) ?? 0; used.set(base, count + 1);
      const id = count ? `${base}-${count + 1}` : base;
      headings.push({ id, text, level: Number(level) });
      return `<h${level} id="${id}" tabindex="-1">${body}</h${level}>`;
    });
    return { html, headings };
  }
}
