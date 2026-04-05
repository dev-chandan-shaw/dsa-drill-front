import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { inject } from '@angular/core';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const isAdmin = authService.isAdmin();
    const router = inject(Router);
    if (!isAdmin()) {
        // Redirect to login page if not authenticated
        router.navigate(['/']);
        return false;
  }
  return true;
};
