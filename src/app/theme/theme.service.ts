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

  // Seed from whatever the pre-paint inline script already applied to the
  // DOM, so there's no window where this signal disagrees with what's
  // painted. On the server there's no class yet, so default to dark
  // (matches the SSR/boot-shell default).
  readonly isDark = signal(this.readInitialDark());

  private readInitialDark(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return this.document.documentElement.classList.contains('dark');
    }
    return true;
  }

  init(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // isDark is already correct (seeded from the DOM above). Just make
    // sure future writes (colorScheme, cleanup of legacy classes) are
    // applied once, without re-deciding or re-toggling the class.
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

  private apply(): void {
    const dark = this.isDark();
    this.document.documentElement.classList.toggle('dark', dark);
    this.document.documentElement.classList.remove('my-app-dark');
    this.document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }
}
