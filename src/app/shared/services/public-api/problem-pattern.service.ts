import { inject, Injectable, signal, TransferState, makeStateKey } from '@angular/core';
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
  private readonly transferState = inject(TransferState);

  private readonly _problemPatterns = signal<IProblemPattern[]>([]);
  public isLoading = signal<boolean>(false); // Progress bar state
  public hasLoaded = signal<boolean>(false); // Cache state
  public readonly problemPatterns = this._problemPatterns.asReadonly();

  fetchProblemPatterns(force: boolean = false): Observable<IProblemPattern[]> {
    if (this.hasLoaded() && !force) return of(this._problemPatterns());

    if (!force) {
      const cached = this.transferState.get(PATTERNS_STATE_KEY, null);
      if (cached) {
        this._problemPatterns.set(cached);
        this.hasLoaded.set(true);
        this.transferState.remove(PATTERNS_STATE_KEY);
        return of(cached);
      }
    }

    // A forced reload always hits the network so post-save refreshes
    // never resolve with stale SSR TransferState data.
    this.transferState.remove(PATTERNS_STATE_KEY);

    this.isLoading.set(true);
    return this.http.get<IProblemPattern[]>(`${this.api}/problem-patterns`).pipe(
      tap((patterns) => {
        this._problemPatterns.set(patterns);
        this.hasLoaded.set(true);
        this.transferState.set(PATTERNS_STATE_KEY, patterns);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  /**
   * Silent freshness pass (stale-while-revalidate), mirroring
   * PublicProblemService.refreshProblemsInBackground: re-hit the network when
   * pattern data is already present and patch the signal on arrival, without
   * touching `hasLoaded` — the list updates in place instead of flashing.
   * No-ops when nothing is loaded yet so cold boots never double-fire.
   */
  refreshProblemPatternsInBackground(): void {
    if (!this.hasLoaded()) {
      return;
    }
    this.http.get<IProblemPattern[]>(`${this.api}/problem-patterns`).subscribe({
      next: (patterns) => this._problemPatterns.set(patterns),
      // Freshness is best-effort: keep showing the snapshot on failure.
      error: () => undefined,
    });
  }

  createProblemPattern(payload: Omit<IProblemPatternDto, 'id'>): Observable<IProblemPattern> {
    return this.http.post<IProblemPattern>(`${this.api}/problem-patterns`, payload);
  }

  updateProblemPattern(payload: IProblemPatternDto): Observable<IProblemPattern> {
    return this.http.post<IProblemPattern>(`${this.api}/problem-patterns`, payload);
  }

  upsertPatternSignal(pattern: IProblemPattern): void {
    const current = this._problemPatterns();
    const index = current.findIndex((item) => item.id === pattern.id);

    if (index === -1) {
      this._problemPatterns.set([...current, pattern]);
    } else {
      this._problemPatterns.set(current.map((item) => (item.id === pattern.id ? pattern : item)));
    }
    this.hasLoaded.set(true);
  }

  removePatternSignal(patternId: number): void {
    this._problemPatterns.set(this._problemPatterns().filter((item) => item.id !== patternId));
  }
}
