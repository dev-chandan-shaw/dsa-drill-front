import { inject, Injectable, Signal, signal } from '@angular/core';
import { AuthApiService } from './auth-api.service';
import { map, Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { IRegisterRequest, IUser } from '../../../shared/models/User';
import { StorageService } from '../storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _authApiService = inject(AuthApiService);
  private readonly _storageService = inject(StorageService);
  private readonly _loggedInUser = signal<IUser | null>(null);
  private readonly _isLoggedIn = signal<boolean | null>(false);
  private readonly _isAdmin = signal<boolean | null>(false);

  isAdmin() {
    if (!this._isAdmin()) {
      this.getLoggedInUser();
      const user = this._loggedInUser();
      const token = user?.token;
      if (token) {
        const roles = this.getRoles(token);
        this._isAdmin.set(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN'));
      }
    }
    return this._isAdmin;
  }

  getLoggedInUser(): Signal<IUser | null> {
    if (!this._loggedInUser()) {
      const user = this._storageService.get('loggedInUser');
      this._loggedInUser.set(user ? JSON.parse(user) : null);
    }
    return this._loggedInUser;
  }

  login(username: string, password: string): Observable<IUser> {
    return this._authApiService.login(username, password).pipe(
      map((response) => {
        const user = response;
        const token = this.resolveToken(user);

        if (!token) {
          throw new Error('Authentication token was not returned by the server.');
        }

        this.setUser(user);
        return user;
      }),
    );
  }

  register(data: IRegisterRequest): Observable<IUser> {
    return this._authApiService.register(data).pipe(
      map((response) => {
        const user = response;
        const token = this.resolveToken(user);

        if (!token) {
          throw new Error('Authentication token was not returned by the server.');
        }

        this.setUser(user);
        return user;
      }),
    );
  }

  fetchCurrentUser(token: string): Observable<IUser> {
    return this._authApiService.fetchCurrentUser(token).pipe(
      map((response) => {
        const user = response.data;
        this.setUser(user);
        return user;
      }),
    );
  }

  setUser(user: IUser): void {
    const normalizedUser = user as IUser & { accessToken?: string; jwt?: string };
    const token = this.resolveToken(normalizedUser);

    if (!token) {
      this.logout();
      return;
    }

    let roles: string[] = [];

    try {
      const decodedToken: any = jwtDecode(token);
      roles = decodedToken.roles || [];
    } catch {
      roles = [];
    }

    this._isAdmin.set(roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN'));

    this._isLoggedIn.set(true);

    this._storageService.set('authToken', token);
    const safeUser: IUser = {
      ...normalizedUser,
      token,
    };
    this._storageService.set('loggedInUser', JSON.stringify(safeUser));
    this._loggedInUser.set(safeUser);
  }

  logout(): void {
    this._storageService.remove('authToken');
    this._storageService.remove('loggedInUser');
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
