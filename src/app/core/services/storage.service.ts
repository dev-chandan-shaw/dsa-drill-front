import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private platformId = inject(PLATFORM_ID);

  set(key: string, value: string): void {
    try {
      this.storage()?.setItem(key, value);
    } catch {
      // Storage unavailable (SSR, private mode, restricted envs): ignore.
    }
  }

  get(key: string): string | null {
    try {
      return this.storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    try {
      this.storage()?.removeItem(key);
    } catch {
      // Ignore when storage is unavailable.
    }
  }

  // isPlatformBrowser alone is not enough: some browser-like environments
  // (unit tests, restricted webviews) have no localStorage object, and
  // private modes can throw on access.
  private storage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  }
}
