import { IProblem } from '../home/models/Question';

export interface ArticleSummary {
  id: number;
  slug: string;
  subject: string;
  section: string;
  title: string;
  excerpt: string | null;
  coverImageUrl?: string | null;
  previewText?: string | null;
  groupId: number | null;
  displayOrder: number;
  readMinutes: number;
  publishedAt: string | null;
  updatedAt: string;
  unpublishedChanges: boolean;
}
export interface LibraryGroup {
  id: number;
  parentId: number | null;
  title: string;
  displayOrder: number;
  version: number | null;
  children: LibraryGroup[];
  articles: ArticleSummary[];
}
export interface LibraryTree {
  subject: string;
  section: string;
  groups: LibraryGroup[];
}
export interface LibraryArticle {
  tagIds: number[];
  summary: ArticleSummary;
  content: string;
  coverImageUrl: string | null;
  breadcrumbs: { id: number; title: string }[];
  problems: IProblem[];
  relatedArticles: ArticleSummary[];
  previous: ArticleSummary | null;
  next: ArticleSummary | null;
}
export interface ArticleDraft {
  tagIds: number[];
  id: number;
  version: number;
  subject: string;
  section: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  groupId: number | null;
  displayOrder: number;
  problemIds: number[];
  relatedArticleIds: number[];
  published: boolean;
  everPublished: boolean;
  unpublishedChanges: boolean;
  savedAt: string;
}
export interface SaveArticleDraft {
  tagIds: number[];
  version: number | null;
  subject: string;
  section: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  groupId: number | null;
  displayOrder: number;
  problemIds: number[];
  relatedArticleIds: number[];
}
export interface SaveLibraryGroup {
  subject: string;
  section: string;
  parentId: number | null;
  title: string;
  displayOrder: number;
  version: number | null;
}
export interface PatternEntry {
  summary: ArticleSummary;
  tagIds: number[];
}
export const articlePath = (a: Pick<ArticleSummary, 'subject' | 'section' | 'slug'>) =>
  `/library/${a.subject}/${a.section}/${a.slug}`;

export function flattenGroups(groups: LibraryGroup[], depth = 0): (LibraryGroup & { depth: number })[] {
  return groups.flatMap((group) => [{ ...group, depth }, ...flattenGroups(group.children, depth + 1)]);
}
