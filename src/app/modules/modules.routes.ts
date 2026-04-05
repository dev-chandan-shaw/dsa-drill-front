import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '',
    loadComponent: () => import('./modules').then((m) => m.Modules),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./home/home').then((m) => m.Home),
      },
      {
        path: 'problems/:slug',
        loadComponent: () =>
          import('./problem-workspace/problem-workspace').then((m) => m.ProblemWorkspace),
      },
    ],
  },
];
