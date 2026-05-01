import { Routes } from '@angular/router';
import { Login } from './core/login/login';
import { Register } from './core/register/register';
import { guestGuard } from './core/guards/guest-guard-guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'register', component: Register, canActivate: [guestGuard] },
  { path: 'signup', component: Register, canActivate: [guestGuard] },
  {
    path: '',
    loadChildren: () => import('./modules/modules.routes').then((m) => m.routes),
  },
  { path: '**', redirectTo: 'login' }, // fallback route
];
