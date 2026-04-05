import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IApiResponse } from '../../../shared/models/ApiResponse';
import { IUserQuestionStatus, UserQuestionStatusDto } from '../models/Question-status';

@Injectable({
  providedIn: 'root',
})
export class QuestionStatusApiService {
  private readonly _apiUrl = environment.apiUrl;
  private readonly _questionStatusEndpoint = `${this._apiUrl}/user-question-status`;
  private readonly _http: HttpClient = inject(HttpClient);

  getAllQuestionStatuses() {
    // return this._http
    //   .get<IApiResponse<IUserQuestionStatus[]>>(`${this._questionStatusEndpoint}`)
    //   .pipe(map((res) => res.data));
    return of<IUserQuestionStatus[]>([]);
  }

  updateQuestionStatus(status: UserQuestionStatusDto): Observable<IApiResponse<null>> {
    return this._http.patch<IApiResponse<null>>(`${this._questionStatusEndpoint}`, status);
  }
}
