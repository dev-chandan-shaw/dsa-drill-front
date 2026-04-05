import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'problems/:slug',
    renderMode: RenderMode.Server, // Tell Angular: "Don't try to build this at compile time"
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
