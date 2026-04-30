import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IUserQuestionStatus, UserQuestionStatusDto } from '../models/Question-status';

@Injectable({
  providedIn: 'root',
})
export class ProblemStatusApiService {
  private readonly _problemStatusEndpoint = `${environment.apiUrl}/user-problem-status`;
  private readonly _http: HttpClient = inject(HttpClient);

  // 1. Keep the state private
  private readonly _problemStatuses = signal<Record<number, IUserQuestionStatus>>({});

  // 2. Expose a read-only version for components
  public readonly problemStatuses = this._problemStatuses.asReadonly();

  fetchProblemStatuses() {
    return this._http.get<IUserQuestionStatus[]>(`${this._problemStatusEndpoint}`).pipe(
      tap((statuses) => {
        this._problemStatuses.set(
          statuses.reduce((acc: Record<number, IUserQuestionStatus>, status) => {
            acc[status.problemId] = status;
            return acc;
          }, {}),
        );
      }),
    );
  }

  updateProblemStatus(status: UserQuestionStatusDto): Observable<boolean> {
    return this._http.post<boolean>(`${this._problemStatusEndpoint}`, status);
  }
}
