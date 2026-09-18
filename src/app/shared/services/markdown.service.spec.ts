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
});
