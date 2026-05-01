import { inject, Injectable, signal, makeStateKey, TransferState } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { finalize, Observable, of, tap } from 'rxjs';
import { IProblem } from '../../../modules/home/models/Question';

const PROBLEMS_STATE_KEY = makeStateKey<IProblem[]>('problems');

@Injectable({
  providedIn: 'root',
})
export class PublicProblemService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);

  private readonly apiUrl = environment.apiUrl + '/public';

  private readonly problemsSignal = signal<IProblem[]>([]);

  public isLoading = signal(false);
  public hasLoaded = signal(false);

  public problems = this.problemsSignal.asReadonly();

  fetchProblems(reload: boolean = false): Observable<IProblem[]> {
    if (this.hasLoaded() && !reload) {
      return of(this.problemsSignal());
    }

    const cached = this.transferState.get(PROBLEMS_STATE_KEY, null);

    if (cached) {
      this.problemsSignal.set(cached);
      this.hasLoaded.set(true);

      this.transferState.remove(PROBLEMS_STATE_KEY);

      return of(cached);
    }

    this.isLoading.set(true);

    return this.http.get<IProblem[]>(`${this.apiUrl}/problems`).pipe(
      tap((res) => {
        this.problemsSignal.set(res);
        this.hasLoaded.set(true);

        this.transferState.set(PROBLEMS_STATE_KEY, res);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  addProblem(payload: IProblem) {
    return this.http.post<IProblem>(`${this.apiUrl}/problems`, payload);
  }

  editProblem(payload: IProblem) {
    return this.http.put<IProblem>(`${this.apiUrl}/problems`, payload);
  }

  getProblemBySlug(slug: string): Observable<IProblem> {
    return this.http.get<IProblem>(`${this.apiUrl}/problems/slug/${slug}`);
  }

  getProblemsByTag(tagId: string): Observable<IProblem[]> {
    return this.http.get<IProblem[]>(`${this.apiUrl}/problems/tag/${tagId}`);
  }
}
