import { Routes } from '@angular/router';
import { adminGuard } from '../core/guards/admin-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./modules').then((m) => m.Modules),
    children: [
      {
        path: '',
        redirectTo: 'home',
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
