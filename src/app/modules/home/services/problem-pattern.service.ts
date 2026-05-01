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
import { IProblemPattern } from '../models/problem-pattern';

const PATTERNS_STATE_KEY = makeStateKey<IProblemPattern[]>('problem-patterns');

export interface IProblemPatternDto {
  id?: number;
  name: string;
  explanation: string;
  tagId: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProblemPatternService {
  private readonly api = environment.apiUrl;
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);

  private readonly _problemPatterns = signal<IProblemPattern[]>([]);
  public readonly problemPatterns = this._problemPatterns.asReadonly();

  fetchProblemPatterns(): Observable<IProblemPattern[]> {
    const cached = this.transferState.get(PATTERNS_STATE_KEY, null as IProblemPattern[] | null);

    if (cached) {
      if (isPlatformBrowser(this.platformId)) {
        this.transferState.remove(PATTERNS_STATE_KEY);
      }
      this._problemPatterns.set(cached);
      return of(cached);
    }

    return this.http.get<IProblemPattern[]>(`${this.api}/problem-patterns`).pipe(
      tap((patterns) => {
        this._problemPatterns.set(patterns);
        this.transferState.set(PATTERNS_STATE_KEY, patterns);
      }),
    );
  }

  createProblemPattern(payload: Omit<IProblemPatternDto, 'id'>): Observable<IProblemPattern> {
    return this.http.post<IProblemPattern>(`${this.api}/problem-patterns`, payload);
  }

  updateProblemPattern(payload: IProblemPatternDto): Observable<IProblemPattern> {
    return this.http.post<IProblemPattern>(`${this.api}/problem-patterns`, payload);
  }
}
