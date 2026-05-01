import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { IRegisterRequest, IUser } from '../../../shared/models/User';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly _apiUrl = environment.apiUrl;
  private readonly _http = inject(HttpClient);

  login(username: string, password: string) {
    return this._http.post<IUser>(`${this._apiUrl}/auth/login`, {
      email: username,
      password,
    });
  }

  register(data: IRegisterRequest) {
    return this._http.post<IUser>(`${this._apiUrl}/auth/register`, data);
  }

  fetchCurrentUser(token?: string) {
    const url = token ? `${this._apiUrl}/auth/user?token=${token}` : `${this._apiUrl}/auth/user`;
    return this._http.get<IUser>(url);
  }

  logout(): Observable<void> {
    return this._http.post<void>(`${this._apiUrl}/auth/logout`, {});
  }
}
