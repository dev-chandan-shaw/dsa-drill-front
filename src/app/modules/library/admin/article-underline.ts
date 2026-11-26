import { toggleMark } from '@milkdown/kit/prose/commands';
import { $command, $markSchema, $remark } from '@milkdown/kit/utils';
import type { Handle } from 'mdast-util-to-markdown';

const underline = 'underline';

export const underlineSchema = $markSchema(underline, () => ({
  // Keep a continuous underline around changes in bold or italic where possible.
  priority: 40,
  parseDOM: [{ tag: 'u' }],
  toDOM: () => ['u', 0],
  parseMarkdown: {
    match: node => node.type === underline,
    runner: (state, node, markType) => {
      state.openMark(markType).next(node.children).closeMark(markType);
    },
  },
  toMarkdown: {
    match: mark => mark.type.name === underline,
    runner: (state, mark) => { state.withMark(mark, underline); },
  },
}));

export const toggleUnderlineCommand = $command('ToggleUnderline', ctx => () =>
  toggleMark(underlineSchema.type(ctx)),
);

// Markdown has no underline delimiter. Pair literal <u> tags at the AST level
// so nested Markdown still works and tags inside code stay literal.
type InlineTree = { type: string; children?: InlineTree[]; value?: unknown };

function parseUnderline({ children }: InlineTree): void {
  if (!children) return;
  const openings: number[] = [];
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    parseUnderline(child);
    if (child.type !== 'html' || typeof child.value !== 'string') continue;
    if (/^<u>$/i.test(child.value)) {
      openings.push(index);
    } else if (/^<\/u>$/i.test(child.value)) {
      const start = openings.pop();
      if (start === undefined) continue;
      children.splice(start, index - start + 1, {
        type: underline,
        children: children.slice(start + 1, index),
      });
      index = start;
    }
  }
}

const remarkUnderline = $remark('articleUnderline', () => function () {
  const extensions = this.data('toMarkdownExtensions') ?? [];
  const handlers: Record<string, Handle> = {
    underline(node, _parent, state, info) {
      const tracker = state.createTracker(info);
      const open = tracker.move('<u>');
      const inner = state.containerPhrasing(node, { ...tracker.current(), before: '>', after: '<' });
      return open + tracker.move(inner) + tracker.move('</u>');
    },
  };
  this.data('toMarkdownExtensions', [...extensions, { handlers }]);
  return parseUnderline;
});

export const articleUnderline = [underlineSchema, toggleUnderlineCommand, remarkUnderline].flat();
