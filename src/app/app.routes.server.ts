import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server, // handles the root redirect
  },
  {
    path: 'problems/:slug',
    renderMode: RenderMode.Server, // Tell Angular: "Don't try to build this at compile time"
  },
  {
    path: 'home',
    renderMode: RenderMode.Server,
  },
  {
    path: 'admin',
    renderMode: RenderMode.Server,
  },
  {
    path: 'question-pattern',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
