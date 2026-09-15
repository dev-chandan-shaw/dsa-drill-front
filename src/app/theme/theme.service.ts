import { DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from '../core/services/storage.service';

const THEME_STORAGE_KEY = 'dsa-drill-theme';

/**
 * Owns the light/dark theme. Dark is the default (matches the product's
 * history); on first visit the OS `prefers-color-scheme` is respected.
 * Everything is browser-guarded so SSR/prerender output stays stable —
 * `index.html` also inlines a pre-paint script that applies the same rule
 * to avoid a theme flash before hydration.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storage = inject(StorageService);
  private readonly document = inject(DOCUMENT);

  readonly isDark = signal(true);

  init(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.isDark.set(this.resolveInitialDark());
    this.apply();
  }

  toggle(): void {
    this.setDark(!this.isDark());
  }

  setDark(dark: boolean): void {
    this.isDark.set(dark);
    this.storage.set(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
    this.apply();
  }

  private resolveInitialDark(): boolean {
    const stored = this.storage.get(THEME_STORAGE_KEY);
    if (stored === 'light') {
      return false;
    }
    if (stored === 'dark') {
      return true;
    }
    // No stored preference: respect the OS, defaulting to dark.
    try {
      if (typeof window.matchMedia === 'function') {
        return !window.matchMedia('(prefers-color-scheme: light)').matches;
      }
    } catch {
      // Ignore and fall through to the default.
    }
    return true;
  }

  private apply(): void {
    const dark = this.isDark();
    this.document.documentElement.classList.toggle('dark', dark);
    this.document.documentElement.classList.remove('my-app-dark');
    this.document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }
}
