import { Routes } from '@angular/router';
import { adminGuard } from '../core/guards/admin-guard';
import { legacyAdminArticleRedirect, legacyLibraryRedirect, resolveLibraryArticle, resolveLibraryPage } from './library/library.resolvers';
import { resolvePatternLibrary } from './question-pattern/pattern-library.resolver';
import {
  resolveBlogPost,
  resolveBlogSections,
  resolveSectionPosts,
} from './system-design/blog.resolvers';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./modules').then((m) => m.Modules),
    children: [
      // The library is the canonical entry point for learning and practice.
      {
        path: '',
        redirectTo: 'library',
        pathMatch: 'full',
      },
      {
        path: 'home',
        redirectTo: 'library',
        pathMatch: 'full',
      },
      {
        path: 'library',
        loadComponent: () => import('./library/library-page').then((m) => m.LibraryPage),
        resolve: { library: resolveLibraryPage }, runGuardsAndResolvers: 'always',
      },
      {
        path: 'library/:subject',
        loadComponent: () => import('./library/library-page').then((m) => m.LibraryPage),
        resolve: { library: resolveLibraryPage }, runGuardsAndResolvers: 'always',
      },
      {
        path: 'library/:subject/:section',
        loadComponent: () => import('./library/library-page').then((m) => m.LibraryPage),
        resolve: { library: resolveLibraryPage }, runGuardsAndResolvers: 'always',
      },
      {
        path: 'library/dsa/patterns/topics/:topicSlug',
        loadComponent: () => import('./library/library-patterns').then((m) => m.LibraryPatterns),
      },
      {
        path: 'library/:subject/:section/:slug',
        loadComponent: () => import('./library/library-reader').then((m) => m.LibraryReader),
        resolve: { library: resolveLibraryArticle }, runGuardsAndResolvers: 'always',
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        canActivateChild: [adminGuard],
        loadComponent: () => import('./admin/admin-workspace').then((m) => m.AdminWorkspace),
        children: [
          { path: '', pathMatch: 'full', redirectTo: ({ queryParams }) => queryParams['tab'] === 'tags' ? 'tags' : queryParams['tab'] === 'problems' ? 'questions' : queryParams['tab'] === 'patterns' ? 'patterns' : 'articles' },
          { path: 'articles', loadComponent: () => import('./library/admin/library-admin').then((m) => m.LibraryAdmin), data: { view: 'articles' } },
          { path: 'questions', loadComponent: () => import('./admin/admin').then((m) => m.Admin), data: { adminSection: 'problems' } },
          { path: 'tags', loadComponent: () => import('./admin/admin').then((m) => m.Admin), data: { adminSection: 'tags' } },
          { path: 'patterns', loadComponent: () => import('./library/admin/library-admin').then((m) => m.LibraryAdmin), data: { view: 'patterns' } },
          { path: 'articles/new', pathMatch: 'full', redirectTo: 'articles/new/edit' },
          { path: 'articles/:id/edit', loadComponent: () => import('./library/admin/library-article-editor').then((m) => m.LibraryArticleEditor), canDeactivate: [(component: { canLeave: () => Promise<boolean> }) => component.canLeave()] },
          { path: 'library', pathMatch: 'full', redirectTo: 'articles' },
          { path: 'library/articles/new', pathMatch: 'full', redirectTo: 'articles/new/edit' },
          { path: 'library/articles/:id/edit', redirectTo: ({ params }) => `articles/${params['id']}/edit` },
          { path: 'patterns/new', pathMatch: 'full', redirectTo: 'articles/new/edit?subject=dsa&section=patterns' },
          { path: 'blogs/new', pathMatch: 'full', redirectTo: 'articles/new/edit' },
          { path: 'patterns/:id/edit', canActivate: [legacyAdminArticleRedirect], data: { sourceType: 'pattern' }, loadComponent: () => import('./admin/pattern-editor/pattern-editor').then((m) => m.PatternEditor) },
          { path: 'blogs/:id/edit', canActivate: [legacyAdminArticleRedirect], data: { sourceType: 'blog' }, loadComponent: () => import('./admin/blog-editor/blog-editor').then((m) => m.BlogEditor) },
        ],
      },
      {
        path: 'system-design',
        canActivate: [legacyLibraryRedirect],
        loadComponent: () =>
          import('./system-design/system-design').then((m) => m.SystemDesign),
        resolve: { sections: resolveBlogSections },
      },
      {
        path: 'system-design/:sectionSlug',
        canActivate: [legacyLibraryRedirect],
        loadComponent: () =>
          import('./system-design/section-posts/section-posts').then((m) => m.SectionPosts),
        resolve: { sectionContent: resolveSectionPosts },
      },
      {
        path: 'system-design/:sectionSlug/:postSlug',
        canActivate: [legacyLibraryRedirect],
        loadComponent: () =>
          import('./system-design/blog-detail/blog-detail').then((m) => m.BlogDetail),
        resolve: { postContent: resolveBlogPost },
      },
      {
        path: 'question-pattern',
        canActivate: [legacyLibraryRedirect],
        loadComponent: () =>
          import('./question-pattern/question-pattern').then((m) => m.QuestionPattern),
        resolve: { library: resolvePatternLibrary },
      },
      {
        path: 'question-pattern/:tagSlug',
        canActivate: [legacyLibraryRedirect],
        loadComponent: () =>
          import('./question-pattern/topic-patterns/topic-patterns').then(
            (m) => m.TopicPatterns,
          ),
        resolve: { library: resolvePatternLibrary },
      },
      {
        path: 'question-pattern/:tagSlug/:patternId',
        canActivate: [legacyLibraryRedirect],
        loadComponent: () =>
          import('./question-pattern/pattern-detail/pattern-detail').then((m) => m.PatternDetail),
        resolve: { library: resolvePatternLibrary },
      },
      {
        path: 'question-pattern/:tagSlug/:patternId/questions',
        canActivate: [legacyLibraryRedirect],
        loadComponent: () =>
          import('./question-pattern/pattern-questions/pattern-questions').then(
            (m) => m.PatternQuestions,
          ),
        resolve: { library: resolvePatternLibrary },
      },
      {
        path: 'problems/:sheetId',
        loadComponent: () => import('./problem-sheet/problem-sheet').then((m) => m.ProblemSheet),
      },
      {
        path: 'problems-sheet/:sheetId',
        loadComponent: () =>
          import('./custom-problem-sheet/custom-problem-sheet').then((m) => m.CustomProblemSheet),
      },
    ],
  },
];
