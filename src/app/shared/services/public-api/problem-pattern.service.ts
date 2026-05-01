import {
  inject,
  Injectable,
  signal,
  PLATFORM_ID,
  TransferState,
  makeStateKey,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IProblemPattern } from '../../../modules/home/models/problem-pattern';

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
  private readonly api = environment.apiUrl + '/public';
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);

  private readonly _problemPatterns = signal<IProblemPattern[]>([]);
  public isLoading = signal<boolean>(false); // Progress bar state
  public hasLoaded = signal<boolean>(false); // Cache state
  public readonly problemPatterns = this._problemPatterns.asReadonly();

  fetchProblemPatterns(): Observable<IProblemPattern[]> {
    if (this.hasLoaded()) return of([]);

    this.isLoading.set(true);
    return this.http.get<IProblemPattern[]>(`${this.api}/problem-patterns`).pipe(
      tap((patterns) => {
        this._problemPatterns.set(patterns);
        this.hasLoaded.set(true);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  createProblemPattern(payload: Omit<IProblemPatternDto, 'id'>): Observable<IProblemPattern> {
    return this.http.post<IProblemPattern>(`${this.api}/problem-patterns`, payload);
  }

  updateProblemPattern(payload: IProblemPatternDto): Observable<IProblemPattern> {
    return this.http.post<IProblemPattern>(`${this.api}/problem-patterns`, payload);
  }
}
