import {
  inject,
  Injectable,
  signal,
  PLATFORM_ID,
  TransferState,
  makeStateKey,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IUserQuestionStatus, UserQuestionStatusDto } from '../models/Question-status';

const STATUSES_STATE_KEY = makeStateKey<IUserQuestionStatus[]>('problem-statuses');

@Injectable({
  providedIn: 'root',
})
export class ProblemStatusApiService {
  private readonly _problemStatusEndpoint = `${environment.apiUrl}/user-problem-status`;
  private readonly _http: HttpClient = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);

  // 1. Keep the state private
  private readonly _problemStatuses = signal<Record<number, IUserQuestionStatus>>({});

  // 2. Expose a read-only version for components
  public readonly problemStatuses = this._problemStatuses.asReadonly();

  fetchProblemStatuses() {
    const cached = this.transferState.get(STATUSES_STATE_KEY, null as IUserQuestionStatus[] | null);

    if (cached) {
      if (isPlatformBrowser(this.platformId)) {
        this.transferState.remove(STATUSES_STATE_KEY);
      }
      this._problemStatuses.set(
        cached.reduce((acc: Record<number, IUserQuestionStatus>, status) => {
          acc[status.problemId] = status;
          return acc;
        }, {}),
      );
      return of(cached);
    }

    return this._http.get<IUserQuestionStatus[]>(`${this._problemStatusEndpoint}`).pipe(
      tap((statuses) => {
        this._problemStatuses.set(
          statuses.reduce((acc: Record<number, IUserQuestionStatus>, status) => {
            acc[status.problemId] = status;
            return acc;
          }, {}),
        );
        this.transferState.set(STATUSES_STATE_KEY, statuses);
      }),
    );
  }

  updateProblemStatus(status: UserQuestionStatusDto): Observable<boolean> {
    return this._http.post<boolean>(`${this._problemStatusEndpoint}`, status);
  }
}
