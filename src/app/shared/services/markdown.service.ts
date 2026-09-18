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
  render(content: string | null | undefined): string {
    const source = content ?? '';
    if (!source.trim()) {
      return '';
    }
    const html = marked.parse(source, { gfm: true }) as string;
    return sanitizeHtml(html, {
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
          attribs: { ...attribs, target: '_blank', rel: 'noopener' },
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
}
