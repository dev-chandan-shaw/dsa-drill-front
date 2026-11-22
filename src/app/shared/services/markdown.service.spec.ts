import { TestBed } from '@angular/core/testing';
import { MarkdownService } from './markdown.service';

describe('MarkdownService', () => {
  let service: MarkdownService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MarkdownService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('renders basic markdown', () => {
    const html = service.render('**bold** and `code`');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
  });

  it('returns empty string for empty content', () => {
    expect(service.render('')).toBe('');
    expect(service.render(null)).toBe('');
    expect(service.render(undefined)).toBe('');
  });

  it('strips script tags and event handlers', () => {
    const html = service.render('hi <script>alert(1)</script> <img src="x" onerror="alert(1)">');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onerror');
  });

  it('neutralizes javascript: links', () => {
    const html = service.render('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('keeps https image sources', () => {
    const html = service.render('![alt](https://res.cloudinary.com/demo/a.png)');
    expect(html).toContain('src="https://res.cloudinary.com/demo/a.png"');
  });

  it('uses soft line breaks like GitHub (no forced <br>)', () => {
    const html = service.render('line one\nline two');
    expect(html).not.toContain('<br>');
    expect(html).toContain('<p>line one\nline two</p>');
  });

  it('opens links in a new tab', () => {
    const html = service.render('[guide](https://example.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
  });

  it('keeps fenced code language classes for highlighting', () => {
    const html = service.render('```python\nx = 1\n```');
    expect(html).toContain('class="language-python"');
  });

  it('strips inter-tag newlines but keeps inner soft breaks (pre-wrap safety)', () => {
    const html = service.render('> line one\n> line two');
    expect(html).toContain('<blockquote><p>line one\nline two</p></blockquote>');
    expect(html).not.toMatch(/>\n</);
  });

  it('joins list items without inter-tag whitespace', () => {
    const html = service.render('- alpha\n- beta');
    expect(html).toContain('<ul><li>alpha</li><li>beta</li></ul>');
  });

  it('preserves inline spaces between elements', () => {
    const html = service.render('click [guide](https://example.com) `code`');
    expect(html).toContain('</a> <code>');
  });

  it('generates unique article anchors while excluding code-block headings', () => {
    const rendered = service.renderArticle('## **Factory** & Builder\n\n## Factory & Builder\n\n```md\n## Not a heading\n```');
    expect(rendered.headings.map((h) => h.id)).toEqual(['section-factory-builder', 'section-factory-builder-2']);
    expect(rendered.headings[0].text).toBe('Factory & Builder');
    expect(rendered.html).toContain('id="section-factory-builder"');
    expect(rendered.html).not.toContain('id="section-not-a-heading"');
  });

  it('keeps article cross-links in the current tab and external links in a new tab', () => {
    const html = service.renderArticle('[Factory](/library/lld/concepts/factory) [Outside](https://example.com)').html;
    const root = document.createElement('div'); root.innerHTML = html;
    expect(root.querySelector('a[href^="/library"]')?.getAttribute('target')).toBeNull();
    expect(root.querySelector('a[href^="https"]')?.getAttribute('target')).toBe('_blank');
  });
});
