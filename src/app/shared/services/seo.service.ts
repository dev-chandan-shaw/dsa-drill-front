import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_URL } from '../../core/api-origins';

export interface PageMeta {
  title: string;
  description: string;
  /** Router path, e.g. '/', '/home', '/problems/array'. Used for og:url + canonical. */
  path?: string;
  /** Absolute image URL for og:image / twitter:image. Omit to use the default logo. */
  image?: string;
  /** robots content, defaults to index,follow. Pass noindex for private pages. */
  robots?: string;
}

/**
 * Single funnel for <head> tags so SSR/prerender output and client
 * navigation stay consistent. All APIs (Title/Meta/DOCUMENT) are
 * SSR-safe and run during prerender, so crawlers see the final tags.
 */
@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  setPageMeta({ title, description, path, image, robots }: PageMeta): void {
    const url = path ? `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}` : SITE_URL;
    const ogImage = image ?? `${SITE_URL}/dsadrilllogo.png`;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    if (robots) {
      this.meta.updateTag({ name: 'robots', content: robots });
    }

    // Open Graph
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'DSA Drill' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: ogImage });

    // Twitter
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });

    this.setCanonical(url);
  }

  private setCanonical(href: string): void {
    const head = this.document.head;
    if (!head) {
      return;
    }
    let link = head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
