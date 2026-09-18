import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

let linkHookRegistered = false;

/** Forces rendered links to open in a new tab (notes/patterns link out). */
function ensureLinkHook(): void {
  if (linkHookRegistered) {
    return;
  }
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener');
    }
  });
  linkHookRegistered = true;
}

/**
 * Renders user-authored markdown to XSS-safe HTML (pure GFM, like GitHub).
 * Browser-only by design: on the server it returns an empty string so SSR
 * never emits unsanitized markup (the client fills it in after hydration).
 */
@Injectable({
  providedIn: 'root',
})
export class MarkdownService {
  private readonly platformId = inject(PLATFORM_ID);

  render(content: string | null | undefined): string {
    const source = content ?? '';
    if (!source.trim() || !isPlatformBrowser(this.platformId)) {
      return '';
    }
    const html = marked.parse(source, { gfm: true }) as string;
    ensureLinkHook();
    return DOMPurify.sanitize(html);
  }
}
