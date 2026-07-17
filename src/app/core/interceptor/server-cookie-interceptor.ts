import { inject, PLATFORM_ID, REQUEST } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';

export const serverCookieInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  if (isPlatformServer(platformId)) {
    const request = inject(REQUEST, { optional: true }) as any;
    if (request && request.headers) {
      // Safe check to support both Web API Request (headers.get) and Express Request (headers['cookie'])
      const cookie = typeof request.headers.get === 'function'
        ? request.headers.get('cookie')
        : request.headers['cookie'];

      if (cookie) {
        const cloned = req.clone({
          headers: req.headers.set('Cookie', cookie),
        });
        return next(cloned);
      }
    }
  }

  return next(req);
};
