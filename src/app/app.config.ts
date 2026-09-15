import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { withIncrementalHydration } from '@angular/platform-browser';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideMonacoEditor } from 'ngx-monaco-editor-v2';
import { MAT_CARD_CONFIG } from '@angular/material/card';

import { authInterceptor } from './core/interceptor/auth-interceptor';
import { serverCookieInterceptor } from './core/interceptor/server-cookie-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withIncrementalHydration()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, serverCookieInterceptor])),
    provideMonacoEditor({ baseUrl: '/assets/monaco/vs' }),
    // Outlined cards app-wide (border instead of elevation shadow).
    { provide: MAT_CARD_CONFIG, useValue: { appearance: 'outlined' } },
  ],
};
