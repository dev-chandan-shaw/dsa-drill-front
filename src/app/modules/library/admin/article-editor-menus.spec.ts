import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import { TextSelection } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import { createArticleInsertMenu, articleToolbar } from './article-editor-menus';
import { articleHeadingBehavior } from './article-heading-behavior';
import { articleListBehavior, articleListItemConfig } from './article-list-behavior';
import { articleUnderline } from './article-underline';
import { closeHistory, undo, redo } from '@milkdown/kit/prose/history';
import { replaceAll } from '@milkdown/kit/utils';
import { MarkdownService } from '../../../shared/services/markdown.service';

describe('Article empty-line insert menu', () => {
  let crepe: Crepe;
  let root: HTMLElement;
  let view: EditorView;
  let upload: ReturnType<typeof vi.fn<(file: File) => Promise<string>>>;
  const button = (label: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  const controls = () => root.querySelector<HTMLElement>('.article-insert-controls')!;
  const fileInput = () => root.querySelector<HTMLInputElement>('input[aria-label="Upload article image"]')!;
  const pressEnter = () =>
    view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  const placeCaretAfter = (markdown: string, text: string) => {
    crepe.editor.action(replaceAll(markdown));
    const { doc } = view.state;
    doc.descendants((node, pos) => {
      if (node.isTextblock && node.textContent === text) {
        view.dispatch(view.state.tr.setSelection(TextSelection.create(doc, pos + 1 + node.content.size)));
      }
    });
  };
  const chooseImage = () => {
    const file = new File(['image'], 'diagram.png', { type: 'image/png' });
    Object.defineProperty(fileInput(), 'files', { configurable: true, value: [file] });
    fileInput().dispatchEvent(new Event('change'));
    return file;
  };
  beforeEach(async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    // jsdom has no layout engine; ProseMirror uses these when scrolling a selection.
    Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
    root = document.createElement('div');
    document.body.append(root);
    crepe = new Crepe({ root, defaultValue: '', features: {
      [CrepeFeature.BlockEdit]: false, [CrepeFeature.AI]: false,
      [CrepeFeature.Latex]: false, [CrepeFeature.TopBar]: false,
      [CrepeFeature.CodeMirror]: false,
    }, featureConfigs: {
      [CrepeFeature.Toolbar]: articleToolbar, [CrepeFeature.Cursor]: { virtual: false },
      [CrepeFeature.ListItem]: articleListItemConfig,
    } });
    upload = vi.fn(async () => 'https://example.com/diagram.png');
    crepe.editor.use(createArticleInsertMenu(upload)).use(articleHeadingBehavior).use(articleListBehavior).use(articleUnderline);
    await crepe.create();
    view = crepe.editor.action(ctx => ctx.get(editorViewCtx));
    view.focus();
    view.dispatch(view.state.tr);
  });
  afterEach(async () => { await crepe?.destroy(); root.remove(); vi.unstubAllGlobals(); });

  it('opens and closes without changing the document or selection', () => {
    const before = view.state;
    expect(controls().hidden).toBe(false);
    button('Insert content').click();
    expect(button('Close insert menu').getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('.article-insert-open')).not.toBeNull();
    expect(button('Table')).toBeNull();
    expect(view.state.doc.eq(before.doc)).toBe(true);
    expect(view.state.selection.eq(before.selection)).toBe(true);
    button('Close insert menu').click();
    expect(root.querySelector('.article-insert-open')).toBeNull();
    expect(view.state.doc.eq(before.doc)).toBe(true);
    expect(view.state.selection.eq(before.selection)).toBe(true);
  });

  it('hides after typing and reappears only on an empty paragraph', () => {
    button('Insert content').click();
    view.dispatch(view.state.tr.insertText('Hello'));
    expect(controls().hidden).toBe(true);
    const end = view.state.doc.content.size;
    const tr = view.state.tr.insert(end, view.state.schema.nodes['paragraph'].create());
    view.dispatch(tr.setSelection(TextSelection.create(tr.doc, end + 1)));
    expect(controls().hidden).toBe(false);
    expect(button('Insert content').getAttribute('aria-expanded')).toBe('false');
  });

  it.each([
    ['Code block', 'code_block'], ['Divider', 'hr'],
  ])('inserts %s at the empty paragraph without shifting following content', (label, nodeName) => {
    const paragraph = view.state.schema.nodes['paragraph'];
    view.dispatch(view.state.tr.insert(view.state.doc.content.size, paragraph.create(null, view.state.schema.text('Following text'))));
    button('Insert content').click();
    button(label).click();
    expect(view.state.doc.childCount).toBe(2);
    expect(view.state.doc.firstChild?.type.name).toBe(nodeName);
    expect(view.state.doc.lastChild?.textContent).toBe('Following text');
    expect(controls().hidden).toBe(true);
  });

  it('opens the file picker directly and leaves the document unchanged on cancel', () => {
    const picker = vi.spyOn(fileInput(), 'click');
    const before = view.state.doc;
    button('Insert content').click();
    button('Image').click();
    expect(picker).toHaveBeenCalledOnce();
    expect(view.state.doc.eq(before)).toBe(true);
    fileInput().dispatchEvent(new Event('cancel'));
    expect(view.state.doc.eq(before)).toBe(true);
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads the selected file and inserts its image at the empty line', async () => {
    button('Insert content').click();
    button('Image').click();
    const file = chooseImage();
    expect(upload).toHaveBeenCalledWith(file);
    await vi.waitFor(() => expect(view.state.doc.firstChild?.attrs['src']).toBe('https://example.com/diagram.png'));
    expect(view.state.doc.firstChild?.type.name).toBe('image-block');
  });

  it('preserves text typed at the upload location while the request is pending', async () => {
    let finish!: (src: string) => void;
    upload.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    button('Insert content').click();
    button('Image').click();
    chooseImage();
    view.dispatch(view.state.tr.insertText('Do not replace this'));
    finish('https://example.com/diagram.png');
    await vi.waitFor(() => expect(view.state.doc.firstChild?.type.name).toBe('image-block'));
    expect(view.state.doc.lastChild?.textContent).toBe('Do not replace this');
  });

  it('keeps content unchanged after an upload failure', async () => {
    upload.mockRejectedValue(new Error('Upload failed'));
    const before = view.state.doc;
    button('Insert content').click();
    button('Image').click();
    chooseImage();
    await vi.waitFor(() => expect(button('Image').disabled).toBe(false));
    expect(view.state.doc.eq(before)).toBe(true);
  });

  it('closes with Escape and outside clicks, and hides in readonly mode', () => {
    button('Insert content').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(button('Insert content').getAttribute('aria-expanded')).toBe('false');
    button('Insert content').click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(button('Insert content').getAttribute('aria-expanded')).toBe('false');
    crepe.setReadonly(true);
    view.dispatch(view.state.tr);
    expect(controls().hidden).toBe(true);
  });

  it('formats selected text with the configured toolbar and preserves its range', async () => {
    const tr = view.state.tr.insertText('Selected words');
    view.dispatch(tr.setSelection(TextSelection.create(tr.doc, 1, 9)));
    await vi.waitFor(() => expect(button('Bold')).toBeTruthy());
    const selection = view.state.selection;
    button('Bold').dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    expect(view.state.doc.firstChild?.firstChild?.marks.some(mark => mark.type.name === 'strong')).toBe(true);
    expect(view.state.selection.eq(selection)).toBe(true);
    button('Heading').dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    expect(view.state.doc.firstChild?.type.name).toBe('heading');
    expect(view.state.doc.firstChild?.attrs['level']).toBe(2);
    expect(view.state.doc.textContent).toBe('Selected words');
  });

  it('toggles underline on selected text and preserves it in saved Markdown and the reader', async () => {
    crepe.editor.action(replaceAll('A **bold** word and `literal <u>`'));
    const tr = view.state.tr;
    view.dispatch(tr.setSelection(TextSelection.create(tr.doc, 3, 12)));
    await vi.waitFor(() => expect(button('Underline')).toBeTruthy());
    const selection = view.state.selection;
    const toggle = () => button('Underline').dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    toggle();
    expect(view.state.selection.eq(selection)).toBe(true);

    const markdown = crepe.getMarkdown();
    const html = new MarkdownService().renderArticle(markdown).html;
    const rendered = document.createElement('div');
    rendered.innerHTML = html;
    expect(rendered.querySelector('u')?.textContent).toBe('bold word');
    expect(rendered.querySelector('u strong')?.textContent).toBe('bold');
    expect(rendered.querySelector('code')?.textContent).toBe('literal <u>');
    const underlined = view.state.doc;
    crepe.editor.action(replaceAll(markdown));
    expect(view.state.doc.eq(underlined)).toBe(true);
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 3, 12)));
    await vi.waitFor(() => expect(button('Underline')?.classList.contains('active')).toBe(true));
    toggle();
    expect(view.dom.querySelector('u')).toBeNull();
    expect(view.dom.querySelector('strong')?.textContent).toBe('bold');
  });

  it.each(['Heading', 'Subheading'])('resets a cleared %s to body text and restores its format on undo', async label => {
    const text = 'Clear this heading';
    const tr = view.state.tr.insertText(text);
    view.dispatch(tr.setSelection(TextSelection.create(tr.doc, 1, text.length + 1)));
    await vi.waitFor(() => expect(button(label)).toBeTruthy());
    button(label).dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    const before = view.state.doc;
    view.dispatch(closeHistory(view.state.tr).deleteSelection());
    expect(view.state.doc.firstChild?.type.name).toBe('paragraph');
    expect(controls().hidden).toBe(false);
    expect(view.state.selection.from).toBe(1);
    undo(view.state, view.dispatch);
    expect(view.state.doc.eq(before)).toBe(true);
    redo(view.state, view.dispatch);
    expect(view.state.doc.firstChild?.type.name).toBe('paragraph');
    view.dispatch(view.state.tr.insertText('Normal text'));
    expect(view.state.doc.firstChild?.type.name).toBe('paragraph');
  });

  it('preserves heading formatting when only part of its text is deleted', () => {
    const tr = view.state.tr.insertText('Keep this');
    tr.setNodeMarkup(0, view.state.schema.nodes['heading'], { level: 2 });
    view.dispatch(tr);
    view.dispatch(view.state.tr.delete(5, 10));
    expect(view.state.doc.firstChild?.type.name).toBe('heading');
    expect(view.state.doc.firstChild?.attrs['level']).toBe(2);
    expect(view.state.doc.firstChild?.textContent).toBe('Keep');
  });

  it('allows an intentional empty heading, but Backspace resets it instead of making it larger', () => {
    view.dispatch(view.state.tr.setNodeMarkup(0, view.state.schema.nodes['heading'], { level: 2 }));
    expect(view.state.doc.firstChild?.type.name).toBe('heading');
    view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    expect(view.state.doc.firstChild?.type.name).toBe('paragraph');
    expect(controls().hidden).toBe(false);
  });

  it.each([
    ['- Item', 'bullet_list'],
    ['- Item\n- Next item', 'bullet_list'],
    ['1. Item', 'ordered_list'],
    ['- [ ] Item', 'bullet_list'],
  ])('continues %s on the first Enter and exits it on the second', (markdown, listType) => {
    placeCaretAfter(`${markdown}\n\nFollowing text`, 'Item');
    const originalItems = view.state.doc.firstChild!.childCount;
    pressEnter();
    expect(view.state.doc.firstChild?.type.name).toBe(listType);
    expect(view.state.doc.firstChild?.childCount).toBe(originalItems + 1);
    expect(view.state.selection.$from.parent.textContent).toBe('');

    pressEnter();
    expect(view.state.selection.$from.depth).toBe(1);
    expect(view.state.selection.$from.parent.type.name).toBe('paragraph');
    expect(view.state.doc.firstChild?.childCount).toBe(1);
    view.dispatch(view.state.tr.insertText('Body text'));
    expect(view.state.doc.child(1).textContent).toBe('Body text');
    expect(view.state.doc.lastChild?.textContent).toBe('Following text');
  });

  it('exits a nested list one level at a time', () => {
    placeCaretAfter('- Parent\n  - Child', 'Child');
    pressEnter();
    pressEnter();
    expect(view.state.selection.$from.depth).toBe(3);
    expect(view.state.doc.firstChild?.childCount).toBe(2);
    expect(view.state.doc.firstChild?.firstChild?.lastChild?.textContent).toBe('Child');

    pressEnter();
    expect(view.state.selection.$from.depth).toBe(1);
    expect(view.state.doc.firstChild?.childCount).toBe(1);
  });

  it('renders a bullet marker immediately on a new empty item', () => {
    placeCaretAfter('- Item', 'Item');
    pressEnter();
    expect(view.dom.querySelectorAll('.label.bullet svg circle[r="3.5"]')).toHaveLength(2);
    expect(view.state.selection.$from.parent.content.size).toBe(0);
  });

  it('exits a list even when the empty item contains only spaces', () => {
    placeCaretAfter('- Item', 'Item');
    pressEnter();
    view.dispatch(view.state.tr.insertText(' '));
    pressEnter();
    expect(view.state.selection.$from.depth).toBe(1);
    expect(view.state.selection.$from.parent.content.size).toBe(0);
    expect(view.state.doc.firstChild?.childCount).toBe(1);
  });
});
