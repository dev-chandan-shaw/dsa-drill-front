import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

export const guestGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
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

  if (token) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};
