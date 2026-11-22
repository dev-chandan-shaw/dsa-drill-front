import { commandsCtx, editorViewCtx } from '@milkdown/kit/core';
import { imageBlockSchema } from '@milkdown/kit/component/image-block';
import { headingSchema, wrapInBlockTypeCommand, blockquoteSchema, setBlockTypeCommand } from '@milkdown/kit/preset/commonmark';
import { Plugin, PluginKey, TextSelection } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import { $prose } from '@milkdown/kit/utils';
import type { ToolbarFeatureConfig } from '@milkdown/crepe/feature/toolbar';

const icon = (body: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const lineIcon = (body: string) => icon(`<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</g>`);
const plus = lineIcon('<path d="M12 4v16M4 12h16"/>');
const close = lineIcon('<path d="m5 5 14 14M19 5 5 19"/>');

export const articleToolbar: ToolbarFeatureConfig = {
  buildToolbar(builder) {
    const items = builder.build().flatMap(group => group.items);
    builder.clear();
    const formatting = builder.addGroup('formatting', 'Formatting');
    for (const key of ['bold', 'italic', 'link']) {
      const item = items.find(item => item.key === key)!;
      formatting.addItem(key, item);
    }
    const blocks = builder.addGroup('blocks', 'Text style');
    for (const level of [2, 3]) {
      blocks.addItem(`heading-${level}`, {
        label: level === 2 ? 'Heading' : 'Subheading',
        icon: icon(`<text x="4" y="20" font-family="Georgia,serif" font-weight="bold" font-size="${level === 2 ? 24 : 19}">T</text>`),
        active: ctx => {
          const parent = ctx.get(editorViewCtx).state.selection.$from.parent;
          return parent.type === headingSchema.type(ctx) && parent.attrs['level'] === level;
        },
        onRun: ctx => { ctx.get(commandsCtx).call(setBlockTypeCommand.key, { nodeType: headingSchema.type(ctx), attrs: { level } }); },
      });
    }
    blocks.addItem('quote', {
      label: 'Quote', icon: icon('<text x="2" y="23" font-family="Georgia,serif" font-size="32">“</text>'),
      active: () => false,
      onRun: ctx => { ctx.get(commandsCtx).call(wrapInBlockTypeCommand.key, { nodeType: blockquoteSchema.type(ctx) }); },
    });
    const code = items.find(item => item.key === 'code')!;
    builder.addGroup('code', 'Code').addItem('code', code);
  },
};

export function isEmptyInsertLine(view: EditorView): boolean {
  const { empty, $from } = view.state.selection;
  return view.editable && empty && $from.depth === 1
    && $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0;
}

/** A menu-only control: opening it never dispatches a document transaction. */
export function createArticleInsertMenu(upload: (file: File) => Promise<string>) {
  const uploadAnchor = new PluginKey<number | null>('article-image-upload');
  return $prose(ctx => new Plugin<number | null>({
  key: uploadAnchor,
  state: {
    init: () => null,
    apply(tr, position) {
      const next = tr.getMeta(uploadAnchor) as number | null | undefined;
      if (next !== undefined) return next;
      if (position === null) return null;
      const mapped = tr.mapping.mapResult(position, 1);
      return mapped.deleted ? null : mapped.pos;
    },
  },
  view(view) {
    const document = view.dom.ownerDocument;
    const window = document.defaultView!;
    const host = view.dom.parentElement!;
    const controls = document.createElement('div');
    controls.className = 'article-insert-controls';
    controls.contentEditable = 'false';
    controls.hidden = true;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'article-insert-toggle';
    const menu = document.createElement('div');
    menu.className = 'article-insert-options';
    menu.setAttribute('role', 'group');
    menu.setAttribute('aria-label', 'Insert content');
    controls.append(toggle, menu);
    host.append(controls);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.hidden = true;
    fileInput.setAttribute('aria-label', 'Upload article image');
    host.append(fileInput);
    let open = false;
    let destroyed = false;
    let uploading = false;
    let position: number | null = null;
    let frame = 0;
    const setOpen = (value: boolean) => {
      open = value;
      host.classList.toggle('article-insert-open', value);
      menu.hidden = !value;
      toggle.innerHTML = value ? close : plus;
      toggle.setAttribute('aria-label', value ? 'Close insert menu' : 'Insert content');
      toggle.setAttribute('title', value ? 'Close insert menu' : 'Insert content');
      toggle.setAttribute('aria-expanded', String(value));
    };
    setOpen(false);
    const update = () => {
      const focused = view.hasFocus() || controls.contains(document.activeElement);
      const visible = focused && isEmptyInsertLine(view);
      controls.hidden = !visible;
      const nextPosition = visible ? view.state.selection.from : null;
      if (position !== nextPosition || !visible) setOpen(false);
      position = nextPosition;
      if (!visible) return;
      const paragraph = view.nodeDOM(view.state.selection.$from.before()) as HTMLElement | null;
      if (!paragraph) return;
      const rect = paragraph.getBoundingClientRect();
      const parent = host.getBoundingClientRect();
      const gap = Number.parseFloat(window.getComputedStyle(controls).columnGap) || 0;
      controls.style.top = `${rect.top - parent.top + host.scrollTop + (rect.height - toggle.offsetHeight) / 2}px`;
      controls.style.left = `${rect.left - parent.left - toggle.offsetWidth - gap}px`;
    };
    const schedule = () => { window.cancelAnimationFrame(frame); frame = window.requestAnimationFrame(update); };
    // Keep the editor selection intact for pointer interactions; keyboard focus is supported too.
    controls.addEventListener('pointerdown', event => event.preventDefault());
    toggle.addEventListener('click', () => { if (isEmptyInsertLine(view)) setOpen(!open); });
    const imageButton = document.createElement('button');
    imageButton.type = 'button';
    imageButton.title = 'Image';
    imageButton.setAttribute('aria-label', 'Image');
    imageButton.innerHTML = lineIcon('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 18 6-6 4 4 3-3 4 4"/>');
    imageButton.addEventListener('click', () => {
      if (uploading || !isEmptyInsertLine(view)) return;
      view.dispatch(view.state.tr.setMeta(uploadAnchor, view.state.selection.$from.before()));
      // Keep this synchronous with the button click so browsers allow the picker.
      fileInput.click();
    });
    menu.append(imageButton);
    const clearUpload = () => {
      fileInput.value = '';
      view.dispatch(view.state.tr.setMeta(uploadAnchor, null));
    };
    fileInput.addEventListener('cancel', clearUpload);
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) { clearUpload(); return; }
      uploading = true;
      imageButton.disabled = true;
      imageButton.setAttribute('aria-busy', 'true');
      setOpen(false);
      try {
        const src = await upload(file);
        if (destroyed || !view.editable) return;
        const anchor = uploadAnchor.getState(view.state);
        if (anchor == null) return;
        const target = view.state.doc.nodeAt(anchor);
        if (!target) return;
        const image = imageBlockSchema.type(ctx).create({ src });
        const empty = target.type.name === 'paragraph' && target.content.size === 0;
        // Track the original line through edits while uploading; never replace text the user has typed.
        const tr = view.state.tr.replaceWith(anchor, empty ? anchor + target.nodeSize : anchor, image);
        view.dispatch(tr.setMeta(uploadAnchor, null));
      } catch {
        // The shared upload callback reports errors in the editor's alert.
      } finally {
        if (!destroyed) {
          uploading = false;
          imageButton.disabled = false;
          imageButton.removeAttribute('aria-busy');
          clearUpload();
        }
      }
    });
    const actions = [
      { label: 'Code block', icon: lineIcon('<path d="m8 5-7 7 7 7m8-14 7 7-7 7M14 3l-4 18"/>'), node: () => view.state.schema.nodes['code_block'].createAndFill() },
      { label: 'Divider', icon: lineIcon('<path d="M3 5h18M3 19h18"/><circle cx="6" cy="12" r=".7"/><circle cx="12" cy="12" r=".7"/><circle cx="18" cy="12" r=".7"/>'), node: () => view.state.schema.nodes['hr'].createAndFill() },
    ];
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.title = action.label;
      button.setAttribute('aria-label', action.label);
      button.innerHTML = action.icon;
      button.addEventListener('click', () => {
        if (!isEmptyInsertLine(view)) { setOpen(false); return; }
        const node = action.node();
        if (!node) return;
        const { $from } = view.state.selection;
        const start = $from.before();
        const tr = view.state.tr.replaceWith(start, $from.after(), node);
        tr.setSelection(TextSelection.near(tr.doc.resolve(start + 1)));
        setOpen(false);
        view.dispatch(tr.scrollIntoView());
        view.focus();
      });
      menu.append(button);
    }
    const outside = (event: PointerEvent) => { if (!controls.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); view.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    host.addEventListener('focusin', schedule);
    host.addEventListener('focusout', schedule);
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(view.dom);
    schedule();
    return {
      update,
      destroy() {
        destroyed = true;
        window.cancelAnimationFrame(frame);
        observer.disconnect();
        document.removeEventListener('pointerdown', outside);
        document.removeEventListener('keydown', escape);
        host.removeEventListener('focusin', schedule);
        host.removeEventListener('focusout', schedule);
        window.removeEventListener('resize', schedule);
        controls.remove();
        fileInput.remove();
        host.classList.remove('article-insert-open');
      },
    };
  },
  }));
}
