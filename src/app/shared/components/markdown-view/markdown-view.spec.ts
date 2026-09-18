import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarkdownView } from './markdown-view';

describe('MarkdownView', () => {
  let component: MarkdownView;
  let fixture: ComponentFixture<MarkdownView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkdownView],
    }).compileComponents();

    fixture = TestBed.createComponent(MarkdownView);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('content', 'hello');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('highlights fenced code blocks', async () => {
    fixture.componentRef.setInput('content', '```python\ndef f():\n    pass\n```');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const code = fixture.nativeElement.querySelector(
      '.markdown-body pre code',
    ) as HTMLElement;
    expect(code?.dataset['highlighted']).toBe('yes');
    expect(code?.querySelector('.hljs-keyword')?.textContent).toContain('def');
  });

  it('leaves unknown languages plain without throwing', async () => {
    fixture.componentRef.setInput('content', '```brainfuck-ish\n++--\n```');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const code = fixture.nativeElement.querySelector(
      '.markdown-body pre code',
    ) as HTMLElement;
    expect(code?.textContent).toContain('++--');
  });

  it('applies component styles to rendered markdown nodes (no encapsulation gap)', async () => {
    // Regression: with emulated encapsulation, selectors like
    // `.markdown-body pre` never match [innerHTML] nodes, so blocks render
    // unstyled while string-based innerHTML assertions stay green.
    fixture.componentRef.setInput('content', '![alt](https://example.com/a.png)');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.markdown-body img') as HTMLElement;
    expect(img).toBeTruthy();
    expect(getComputedStyle(img).display).toBe('block');
  });
});
