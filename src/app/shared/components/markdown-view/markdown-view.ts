import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';
import { MarkdownService } from '../../services/markdown.service';

// Common DSA/problem languages only — keeps the lazy chunk small.
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('yaml', yaml);

@Component({
  selector: 'app-markdown-view',
  templateUrl: './markdown-view.html',
  styleUrl: './markdown-view.scss',
  // Styles must be global: rendered markdown is injected via [innerHTML],
  // so its nodes never receive Angular's _ngcontent attributes and
  // emulated-encapsulation selectors (e.g. `.markdown-body pre`) can never
  // match them. The .markdown-body scope keeps the rules contained.
  encapsulation: ViewEncapsulation.None,
})
export class MarkdownView {
  content = input<string>('');

  private readonly markdown = inject(MarkdownService);
  private readonly host = inject(ElementRef);
  readonly html = computed(() => this.markdown.render(this.content()));

  constructor() {
    // afterRenderEffect only runs in the browser, so SSR output stays
    // untouched and hydration sees the same empty-then-filled DOM.
    afterRenderEffect(() => {
      this.html(); // re-run when content changes
      const root = this.host.nativeElement as HTMLElement;
      root.querySelectorAll('pre code').forEach((block) => {
        const el = block as HTMLElement;
        if (el.dataset['highlighted']) {
          return;
        }
        const lang = [...el.classList]
          .find((cls) => cls.startsWith('language-'))
          ?.slice('language-'.length);
        if (lang && !hljs.getLanguage(lang)) {
          el.classList.remove(`language-${lang}`);
        }
        try {
          hljs.highlightElement(el);
        } catch {
          // Unknown markup — leave the block plain.
        }
      });
    });
  }
}
