import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { catchError, map, of } from 'rxjs';

export const guestGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const authService = inject(AuthService);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const cachedUser = authService.getLoggedInUser()();

  if (cachedUser) {
    return router.createUrlTree(['/home']);
  }

  return authService.loadCurrentUser().pipe(
    map((user) => {
      return user ? router.createUrlTree(['/home']) : true;
    }),
    catchError(() => of(true)),
  );
};
