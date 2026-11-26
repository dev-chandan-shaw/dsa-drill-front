import { listItemSchema, paragraphSchema } from '@milkdown/kit/preset/commonmark';
import { liftListItem } from '@milkdown/kit/prose/schema-list';
import { TextSelection } from '@milkdown/kit/prose/state';
import { $shortcut } from '@milkdown/kit/utils';

export const articleListItemConfig = {
  bulletIcon: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.5"/></svg>',
};

export const articleListBehavior = $shortcut(ctx => ({
  ExitEmptyListItem: {
    key: 'Enter',
    priority: 100,
    onRun: () => (state, dispatch) => {
      const { selection } = state;
      const cursor = selection instanceof TextSelection && selection.$cursor;
      if (!cursor || cursor.depth < 2 || cursor.parent.type !== paragraphSchema.type(ctx)) return false;

      const item = cursor.node(-1);
      if (item.type !== listItemSchema.type(ctx) || item.childCount !== 1) return false;
      const { textContent, content } = cursor.parent;
      // Treat spaces as empty, but don't discard inline images or hard breaks.
      if (textContent.trim() || textContent.length !== content.size) return false;

      return liftListItem(item.type)(state, dispatch && (tr => {
        if (content.size) {
          const { $from } = tr.selection;
          tr.delete($from.start(), $from.end());
        }
        dispatch(tr);
      }));
    },
  },
}));
