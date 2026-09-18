import { inject, Injectable, signal, TransferState, makeStateKey } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, finalize, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IProblemPattern } from '../../../modules/home/models/problem-pattern';

const PATTERNS_STATE_KEY = makeStateKey<IProblemPattern[]>('problem-patterns');

export interface IProblemPatternDto {
  id?: number;
  name: string;
  explanation: string;
  tagIds: number[];
  problemIds: number[];
}

/** Raw API shape — tolerant of the pre-migration single-tag payload. */
interface RawProblemPattern {
  id: number;
  name: string;
  explanation: string;
  tagIds?: unknown;
  tagId?: unknown;
  problemIds?: unknown;
}

function numericIds(value: unknown): number[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is number => typeof id === 'number'))]
    : [];
}

export function normalizePattern(raw: RawProblemPattern): IProblemPattern {
  const tagIds = numericIds(raw.tagIds);
  return {
    id: raw.id,
    name: raw.name,
    explanation: raw.explanation ?? '',
    tagIds: tagIds.length
      ? tagIds
      : typeof raw.tagId === 'number'
        ? [raw.tagId]
        : [],
    problemIds: numericIds(raw.problemIds),
  };
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
    return this.http.get<RawProblemPattern[]>(`${this.api}/problem-patterns`).pipe(
      map((patterns) => patterns.map((raw) => normalizePattern(raw))),
      tap((normalized) => {
        this._problemPatterns.set(normalized);
        this.hasLoaded.set(true);
        this.transferState.set(PATTERNS_STATE_KEY, normalized);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  createProblemPattern(
    payload: Omit<IProblemPatternDto, 'id'>,
  ): Observable<IProblemPattern> {
    return this.http
      .post<RawProblemPattern>(`${this.api}/problem-patterns`, payload)
      .pipe(map(normalizePattern));
  }

  updateProblemPattern(payload: IProblemPatternDto): Observable<IProblemPattern> {
    return this.http
      .post<RawProblemPattern>(`${this.api}/problem-patterns`, payload)
      .pipe(map(normalizePattern));
  }

  upsertPatternSignal(pattern: IProblemPattern | RawProblemPattern): void {
    const normalized = normalizePattern(pattern as RawProblemPattern);
    const current = this._problemPatterns();
    const index = current.findIndex((item) => item.id === normalized.id);

    if (index === -1) {
      this._problemPatterns.set([...current, normalized]);
    } else {
      this._problemPatterns.set(
        current.map((item) => (item.id === normalized.id ? normalized : item)),
      );
    }
    this.hasLoaded.set(true);
  }

  removePatternSignal(patternId: number): void {
    this._problemPatterns.set(this._problemPatterns().filter((item) => item.id !== patternId));
  }
}
