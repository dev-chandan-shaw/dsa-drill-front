import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { IRegisterRequest, IUser } from '../../../shared/models/User';
import { IApiResponse } from '../../../shared/models/ApiResponse';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly _apiUrl = environment.apiUrl;
  private readonly _http = inject(HttpClient);

  login(username: string, password: string) {
    return this._http.post<IApiResponse<IUser>>(`${this._apiUrl}/auth/login`, {
      email: username,
      password,
    });
  }

  register(data: IRegisterRequest) {
    return this._http.post<IApiResponse<IUser>>(`${this._apiUrl}/auth/register`, data);
  }

  fetchCurrentUser(token: string) {
    return this._http.get<IApiResponse<IUser>>(`${this._apiUrl}/auth/user?token=${token}`);
  }
}
