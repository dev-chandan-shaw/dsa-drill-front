import { inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  tap,
  of,
  switchMap,
  catchError,
  throwError,
  finalize,
  shareReplay,
} from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { IUserQuestionStatus, UserQuestionStatusDto } from '../../models/Question-status';
import { AuthService } from '../../../../core/services/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ProblemStatusApiService {
  private readonly _problemStatusEndpoint = `${environment.apiUrl}/user-problem-status`;
  private readonly _http: HttpClient = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);

  // 1. Keep the state private
  private readonly _problemStatuses = signal<Record<number, IUserQuestionStatus>>({});

  // 2. Expose a read-only version for components
  public readonly problemStatuses = this._problemStatuses.asReadonly();
  public readonly hasLoaded = signal(false);
  private statusesRequest: Observable<IUserQuestionStatus[]> | null = null;

  fetchProblemStatuses(force = false) {
    // Per-user data must never touch TransferState: prerendered HTML is
    // shared static output, and baking one user's solved map into it would
    // leak it to every visitor. Statuses are browser-only by design —
    // callers already gate on auth resolution, this is the service-level
    // enforcement.
    if (!isPlatformBrowser(this.platformId)) {
      return of<IUserQuestionStatus[]>([]);
    }

    if (this.hasLoaded() && !force) {
      return of(Object.values(this._problemStatuses()));
    }

    if (!force && this.statusesRequest) {
      return this.statusesRequest;
    }

    const request$ = this._http.get<IUserQuestionStatus[]>(`${this._problemStatusEndpoint}`).pipe(
      tap((statuses) => {
        this._problemStatuses.set(
          statuses.reduce((acc: Record<number, IUserQuestionStatus>, status) => {
            acc[status.problemId] = status;
            return acc;
          }, {}),
        );
        this.hasLoaded.set(true);
      }),
      finalize(() => {
        this.statusesRequest = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.statusesRequest = request$;
    return request$;
  }

  clearStatuses(): void {
    this._problemStatuses.set({});
    this.hasLoaded.set(false);
    this.statusesRequest = null;
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
