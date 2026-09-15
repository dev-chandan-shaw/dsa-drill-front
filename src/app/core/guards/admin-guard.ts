import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, map, of } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Server/prerender: always pass through, the client re-guards on boot.
  // (The /admin route is RenderMode.Client anyway, so this is a safety net.)
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const denied = () => router.createUrlTree(['/']);

  // Fast path: warm boot with a cached admin snapshot.
  const cachedUser = authService.getLoggedInUser()();
  if (cachedUser) {
    return authService.isAdmin()() ? true : denied();
  }

  // Cold boot: wait for the single shared /auth/user revalidation instead of
  // reading the not-yet-hydrated admin flag (which bounced legit admins to /).
  return authService.loadCurrentUser().pipe(
    map((user) => {
      if (!user) {
        return denied();
      }
      return authService.isAdmin()() ? true : denied();
    }),
    catchError(() => of(denied())),
  );
};
