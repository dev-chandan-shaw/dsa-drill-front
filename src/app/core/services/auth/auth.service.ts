import { computed, inject, Injectable, PLATFORM_ID, Signal, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthApiService } from './auth-api.service';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { IRegisterRequest, IUser } from '../../../shared/models/User';
import { Router } from '@angular/router';
import { StorageService } from '../storage.service';
import { ToastService } from '../../../shared/services/toast-service';

// Profile-only snapshot (no tokens — the JWT stays in its httpOnly cookie).
// Lets the header render the logged-in state on first paint; every boot still
// revalidates against /auth/user and drops the snapshot on 401.
const USER_SNAPSHOT_KEY = 'dsa-drill-user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _authApiService = inject(AuthApiService);
  private readonly _loggedInUser = signal<IUser | null>(null);
  private readonly _isLoggedIn = computed(() => this._loggedInUser() !== null);
  private readonly _isAdmin = signal<boolean | null>(false);
  private readonly _isAuthResolved = signal<boolean>(false);
  readonly _isAuthLoading = signal<boolean>(false);
  private currentUserRequest: Observable<IUser | null> | null = null;
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storage = inject(StorageService);
  private readonly toastService = inject(ToastService);

  readonly isCompletingOAuth = signal(false);

  constructor() {
    this.hydrateUserFromStorage();
  }

  isLoggedIn() {
    return this._isLoggedIn;
  }

  isAdmin() {
    return this._isAdmin.asReadonly();
  }

  getLoggedInUser(): Signal<IUser | null> {
    return this._loggedInUser;
  }

  getAuthResolved(): Signal<boolean> {
    return this._isAuthResolved;
  }

  getAuthLoading(): Signal<boolean> {
    return this._isAuthLoading;
  }

  login(username: string, password: string): Observable<IUser> {
    return this._authApiService.login(username, password).pipe(
      map((response) => {
        // Single funnel: sets the user, persists the snapshot, AND derives
        // the admin flag — a manual set/persist here once skipped the admin
        // derivation, hiding admin UI until the next reload/revalidation.
        this.setSessionUser(response);
        return response;
      }),
    );
  }

  register(data: IRegisterRequest): Observable<IUser> {
    return this._authApiService.register(data).pipe(
      map((response) => {
        // Same funnel as login (see above).
        this.setSessionUser(response);
        return response;
      }),
    );
  }

  loadCurrentUser(): Observable<IUser | null> {
    if (this._isAuthResolved()) {
      return of(this._loggedInUser());
    }

    if (this.currentUserRequest) {
      return this.currentUserRequest;
    }

    this._isAuthLoading.set(true);
    const request$ = this._authApiService.fetchCurrentUser().pipe(
      tap((user) => this.setSessionUser(user)),
      map((user) => user || null),
      catchError(() => {
        this.clearUser();
        return of(null);
      }),
      finalize(() => {
        this._isAuthResolved.set(true);
        this._isAuthLoading.set(false);
        this.currentUserRequest = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.currentUserRequest = request$;
    return request$;
  }

  logout() {
    this._authApiService.logout().subscribe({
      next: () => this.clearUser(),
      error: (err) => console.error(err),
      complete: () => this.router.navigate(['/login']), // Runs no matter what
    });
  }

  /**
   * Surfaces a Google sign-in failure redirected back to /login as
   * ?error=true&msg=... by the backend. Success needs no handling: the
   * session arrives purely via the httpOnly cookie and App boot already
   * revalidates it with loadCurrentUser. No-ops on ordinary visits.
   */
  handleOAuthReturn(options: { error?: string | null; message?: string | null }): void {
    const { error, message } = options;

    if (!error) {
      return;
    }

    this.toastService.showError(
      'Google sign-in failed',
      message || 'The Google sign-in was not completed. Please try again.',
    );
    this.clearOAuthParams();
  }

  ensureLoggedIn(redirectUrl?: string): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(true);
    }

    const cachedUser = this._loggedInUser();
    if (cachedUser) {
      return of(true);
    }

    return this.loadCurrentUser().pipe(
      map((user) => {
        if (user) {
          return true;
        }
        this.redirectToLogin(redirectUrl);
        return false;
      }),
      catchError(() => {
        this.redirectToLogin(redirectUrl);
        return of(false);
      }),
    );
  }

  private clearUser(): void {
    this._loggedInUser.set(null);
    this._isAdmin.set(false);
    this._isAuthResolved.set(true);
    this.storage.remove(USER_SNAPSHOT_KEY);
  }

  private setSessionUser(user: IUser | null): void {
    if (!user) {
      return;
    }
    this._loggedInUser.set(user);
    if (user.role === 'ROLE_ADMIN') {
      this._isAdmin.set(true);
    }
    this.persistUser(user);
  }

  private hydrateUserFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      const raw = this.storage.get(USER_SNAPSHOT_KEY);
      if (!raw) {
        return;
      }
      const user = JSON.parse(raw) as Partial<IUser>;
      if (user && typeof user.id === 'number' && typeof user.email === 'string') {
        this._loggedInUser.set(user as IUser);
        if (user.role === 'ROLE_ADMIN') {
          this._isAdmin.set(true);
        }
      }
    } catch {
      // Corrupted snapshot: ignore it; the boot revalidation cleans up.
      this.storage.remove(USER_SNAPSHOT_KEY);
    }
  }

  private persistUser(user: IUser): void {
    try {
      this.storage.set(USER_SNAPSHOT_KEY, JSON.stringify(user));
    } catch {
      // Storage full or unavailable: session still works for this visit.
    }
  }

  private clearOAuthParams(): void {
    this.router.navigate([], {
      queryParams: { error: null, msg: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private redirectToLogin(redirectUrl?: string): void {
    const returnUrl = redirectUrl || this.router.url || '/';
    this.router.navigate(['/login'], {
      queryParams: { returnUrl },
    });
  }

  getRoles(token: string): string[] {
    const decodedToken: any = jwtDecode(token);
    return decodedToken.roles || [];
  }

  private resolveToken(user: IUser & { accessToken?: string; jwt?: string }): string {
    return user.token || user.accessToken || user.jwt || '';
  }
}
