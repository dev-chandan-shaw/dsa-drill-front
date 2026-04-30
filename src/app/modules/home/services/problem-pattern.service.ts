import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IProblemPattern } from '../models/problem-pattern';

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

  private readonly _problemPatterns = signal<IProblemPattern[]>([]);
  public readonly problemPatterns = this._problemPatterns.asReadonly();

  fetchProblemPatterns(): Observable<IProblemPattern[]> {
    return this.http
      .get<IProblemPattern[]>(`${this.api}/problem-patterns`)
      .pipe(tap((patterns) => this._problemPatterns.set(patterns)));
  }

  createProblemPattern(payload: Omit<IProblemPatternDto, 'id'>): Observable<IProblemPattern> {
    return this.http.post<IProblemPattern>(`${this.api}/problem-patterns`, payload);
  }

  updateProblemPattern(payload: IProblemPatternDto): Observable<IProblemPattern> {
    return this.http.post<IProblemPattern>(`${this.api}/problem-patterns`, payload);
  }
}
