import { inject, PLATFORM_ID, REQUEST } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';

// Absolute backend origin for server-side API calls. The app uses a relative
// '/api' base (proxied by vercel.json in production), which cannot resolve
// without a request origin during prerendering — so on the server only,
// relative API URLs are prefixed with the backend origin. Browser calls keep
// the relative base (and its CORS-free proxying) untouched.
const SERVER_API_ORIGIN = 'https://dsa-drill.duckdns.org';

export const serverCookieInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  if (isPlatformServer(platformId)) {
    if (req.url.startsWith('/api/')) {
      req = req.clone({ url: `${SERVER_API_ORIGIN}${req.url}` });
    }

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
