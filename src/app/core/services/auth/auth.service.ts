import { inject, Injectable, Signal, signal } from '@angular/core';
import { AuthApiService } from './auth-api.service';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { IRegisterRequest, IUser } from '../../../shared/models/User';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _authApiService = inject(AuthApiService);
  private readonly _loggedInUser = signal<IUser | null>(null);
  private readonly _isLoggedIn = signal<boolean | null>(false);
  private readonly _isAdmin = signal<boolean | null>(false);
  private readonly router = inject(Router);

  isAdmin() {
    // if (!this._isAdmin()) {
    //   this.getLoggedInUser();
    //   const user = this._loggedInUser();
    //   const token = user?.token;
    //   if (token) {
    //     const roles = this.getRoles(token);
    //     this._isAdmin.set(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN'));
    //   }
    // }
    // return this._isAdmin;
    return signal(true);
  }

  getLoggedInUser(): Signal<IUser | null> {
    return this._loggedInUser;
  }

  login(username: string, password: string): Observable<IUser> {
    return this._authApiService.login(username, password).pipe(
      map((response) => {
        const user = response;
        this.setUser(user);
        return user;
      }),
    );
  }

  register(data: IRegisterRequest): Observable<IUser> {
    return this._authApiService.register(data).pipe(
      map((response) => {
        const user = response;
        this.setUser(user);
        return user;
      }),
    );
  }

  loadCurrentUser(): Observable<IUser | null> {
    return this._authApiService.fetchCurrentUser().pipe(
      tap((user) => {
        if (user) {
          this.setUser(user);
        }
      }),
      map((user) => user || null),
      catchError(() => {
        this.clearUser();
        return of(null);
      }),
    );
  }

  setUser(user: IUser): void {
    const normalizedUser = user as IUser & { accessToken?: string; jwt?: string };
    const token = this.resolveToken(normalizedUser);

    let roles: string[] = [];

    try {
      if (token) {
        const decodedToken: any = jwtDecode(token);
        roles = decodedToken.roles || [];
      }
    } catch {
      roles = [];
    }

    this._isAdmin.set(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN'));

    this._isLoggedIn.set(true);

    const safeUser: IUser = token ? { ...normalizedUser, token } : normalizedUser;
    this._loggedInUser.set(safeUser);
  }

  logout() {
    this._authApiService.logout().subscribe({
      next: () => this.clearUser(),
      error: (err) => console.error(err),
      complete: () => this.router.navigate(['/login']), // Runs no matter what
    });
  }

  private clearUser(): void {
    this._loggedInUser.set(null);
    this._isLoggedIn.set(false);
    this._isAdmin.set(false);
  }

  getRoles(token: string): string[] {
    const decodedToken: any = jwtDecode(token);
    return decodedToken.roles || [];
  }

  private resolveToken(user: IUser & { accessToken?: string; jwt?: string }): string {
    return user.token || user.accessToken || user.jwt || '';
  }
}
