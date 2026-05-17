import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // 1. Define URLs that should NOT trigger a redirect on 401
  const bypassUrls = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/user',
    'api/user-problem-status',
  ];
  const isBypassUrl = bypassUrls.some((url) => req.url.includes(url));

  req = req.clone({ withCredentials: true });

  return next(req).pipe(
    catchError((error) => {
      // 2. Only redirect if it's a 401 AND not already an auth request
      if (
        isPlatformBrowser(platformId) &&
        (error.status === 401 || error.status === 403) &&
        !isBypassUrl
      ) {
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
