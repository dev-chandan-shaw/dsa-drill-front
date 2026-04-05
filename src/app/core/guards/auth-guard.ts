import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    // On the server, allow rendering to proceed without redirect
    return true;
  }

  const directToken = localStorage.getItem('authToken');
  const loggedInUserRaw = localStorage.getItem('loggedInUser');
  let fallbackToken = '';

  if (loggedInUserRaw) {
    try {
      const user = JSON.parse(loggedInUserRaw);
      fallbackToken = user?.token || user?.accessToken || user?.jwt || '';
    } catch {
      fallbackToken = '';
    }
  }

  const token = directToken || fallbackToken;
  if (!token) {
    return router.createUrlTree(['/login']);
  }

  return true;
};
