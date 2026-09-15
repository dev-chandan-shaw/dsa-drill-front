import { Routes } from '@angular/router';
import { adminGuard } from '../core/guards/admin-guard';

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
        path: 'question-pattern',
        loadComponent: () =>
          import('./question-pattern/question-pattern').then((m) => m.QuestionPattern),
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
