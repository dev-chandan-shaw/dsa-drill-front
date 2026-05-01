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
import { Observable, tap, of, switchMap, catchError, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IUserQuestionStatus, UserQuestionStatusDto } from '../../models/Question-status';
import { AuthService } from '../../../../core/services/auth/auth.service';

const STATUSES_STATE_KEY = makeStateKey<IUserQuestionStatus[]>('problem-statuses');

@Injectable({
  providedIn: 'root',
})
export class ProblemStatusApiService {
  private readonly _problemStatusEndpoint = `${environment.apiUrl}/user-problem-status`;
  private readonly _http: HttpClient = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);
  private readonly authService = inject(AuthService);

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
    return this.authService.ensureLoggedIn().pipe(
      switchMap((isLoggedIn) => {
        if (!isLoggedIn) {
          return of(false);
        }

        const previous = this.problemStatuses()[status.problemId];
        this.applyLocalStatus(status);

        return this._http.post<boolean>(`${this._problemStatusEndpoint}`, status).pipe(
          tap((success) => {
            if (!success) {
              this.restoreLocalStatus(status.problemId, previous);
            }
          }),
          catchError((error) => {
            this.restoreLocalStatus(status.problemId, previous);
            return throwError(() => error);
          }),
        );
      }),
    );
  }

  private applyLocalStatus(status: UserQuestionStatusDto): void {
    this._problemStatuses.update((current) => {
      const existing = current[status.problemId] ?? { problemId: status.problemId };
      return {
        ...current,
        [status.problemId]: {
          ...existing,
          ...status,
        },
      };
    });
  }

  private restoreLocalStatus(problemId: number, previous?: IUserQuestionStatus): void {
    this._problemStatuses.update((current) => {
      if (!previous) {
        const { [problemId]: _, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [problemId]: previous,
      };
    });
  }
}
