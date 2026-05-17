import { computed, inject, Injectable, PLATFORM_ID, Signal, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthApiService } from './auth-api.service';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { IRegisterRequest, IUser } from '../../../shared/models/User';
import { Router } from '@angular/router';

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
        const user = response;
        this._loggedInUser.set(user);
        return user;
      }),
    );
  }

  register(data: IRegisterRequest): Observable<IUser> {
    return this._authApiService.register(data).pipe(
      map((response) => {
        const user = response;
        this._loggedInUser.set(user);
        return user;
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
      tap((user) => {
        if (user) {
          this._loggedInUser.set(user);
          if (user.role === 'ROLE_ADMIN') {
            this._isAdmin.set(true);
          }
        }
      }),
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
