import { Routes } from '@angular/router';
import { adminGuard } from '../core/guards/admin-guard';
import { resolvePatternLibrary } from './question-pattern/pattern-library.resolver';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./modules').then((m) => m.Modules),
    children: [
      // Root renders Home directly (instead of redirecting) so the static
      // index.html is a full page: better first paint + SEO, and a working
      // SPA fallback shell for client-only deep links.
      {
        path: '',
        loadComponent: () => import('./home/home').then((m) => m.Home),
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () => import('./home/home').then((m) => m.Home),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./admin/admin').then((m) => m.Admin),
      },
      {
        path: 'admin/patterns/new',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./admin/pattern-editor/pattern-editor').then((m) => m.PatternEditor),
      },
      {
        path: 'admin/patterns/:id/edit',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./admin/pattern-editor/pattern-editor').then((m) => m.PatternEditor),
      },
      {
        path: 'question-pattern',
        loadComponent: () =>
          import('./question-pattern/question-pattern').then((m) => m.QuestionPattern),
        resolve: { library: resolvePatternLibrary },
      },
      {
        path: 'question-pattern/:tagSlug',
        loadComponent: () =>
          import('./question-pattern/topic-patterns/topic-patterns').then(
            (m) => m.TopicPatterns,
          ),
        resolve: { library: resolvePatternLibrary },
      },
      {
        path: 'question-pattern/:tagSlug/:patternId',
        loadComponent: () =>
          import('./question-pattern/pattern-detail/pattern-detail').then((m) => m.PatternDetail),
        resolve: { library: resolvePatternLibrary },
      },
      {
        path: 'question-pattern/:tagSlug/:patternId/questions',
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
