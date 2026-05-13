import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { isPlatformServer } from '@angular/common';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Server: always allow through, client will re-guard
  if (isPlatformServer(platformId)) {
    return true;
  }

  // Browser: check admin status
  const isAdmin = authService.isAdmin(); // call once, store result
  if (!isAdmin) {
    return router.createUrlTree(['/home']); // ← redirect to /home not '/'
  } //   avoids triggering root redirect loop

  return true;
};
