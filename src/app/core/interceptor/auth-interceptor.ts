import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { StorageService } from '../services/storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storageService = inject(StorageService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Match by partial URL path so full URLs like http://localhost:8080/api/auth/login are handled correctly.
  // Also skip OAuth routes since those must be browser redirects, not HTTP calls with auth headers.
  const SKIP_PATTERNS = ['/auth/login', '/auth/register', '/oauth2/'];
  const shouldSkip = SKIP_PATTERNS.some((pattern) => req.url.includes(pattern));

  const token = storageService.get('authToken');

  if (!shouldSkip && token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error) => {
      // Only redirect in the browser — on SSR there is no navigation context
      // and re-throwing bypasses RxJS causing an uncaughtException in Node.js.
      if (isPlatformBrowser(platformId) && (error.status === 401 || error.status === 403)) {
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
