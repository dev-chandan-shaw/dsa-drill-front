import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAdmin = authService.isAdmin();
  const platformId = inject(PLATFORM_ID);

  if (isPlatformBrowser(platformId) && !isAdmin()) {
    return router.createUrlTree(['/']);
  }

  return true;
};
