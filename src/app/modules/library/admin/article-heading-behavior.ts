import { headingSchema, paragraphSchema } from '@milkdown/kit/preset/commonmark';
import { Plugin } from '@milkdown/kit/prose/state';
import { Mapping } from '@milkdown/kit/prose/transform';
import { $prose, $shortcut } from '@milkdown/kit/utils';

const resetClearedHeadings = $prose(ctx => new Plugin({
  appendTransaction(transactions, previous, current) {
    if (!transactions.some(transaction => transaction.docChanged)) return null;
    const mapping = new Mapping(transactions.flatMap(transaction => transaction.mapping.maps));
    const heading = headingSchema.type(ctx);
    const tr = current.tr;
    previous.doc.descendants((node, position) => {
      // Newly created empty headings (e.g. typing "## ") must still accept heading text.
      if (node.type !== heading || node.content.size === 0) return;
      const mapped = mapping.mapResult(position, 1);
      if (mapped.deleted) return;
      const updated = current.doc.nodeAt(mapped.pos);
      if (updated?.type === heading && updated.content.size === 0) {
        tr.setNodeMarkup(mapped.pos, paragraphSchema.type(ctx));
      }
    });
    // Appending to the deletion keeps the text and heading style together in undo history.
    return tr.docChanged ? tr : null;
  },
}));

const resetEmptyHeadingOnDelete = $shortcut(ctx => Object.fromEntries(
  ['Backspace', 'Delete'].map(key => [key, {
    key,
    priority: 100,
    onRun: () => (state, dispatch) => {
      const { empty, $from } = state.selection;
      if (!empty || $from.parent.type !== headingSchema.type(ctx) || $from.parent.content.size !== 0) return false;
      // Milkdown's default binding lowers the heading level, which makes the empty line bigger.
      dispatch?.(state.tr.setNodeMarkup($from.before(), paragraphSchema.type(ctx)));
      return true;
    },
  }]),
));

export const articleHeadingBehavior = [resetClearedHeadings, resetEmptyHeadingOnDelete];
