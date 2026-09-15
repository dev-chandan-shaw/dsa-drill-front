import { inject, Injectable, signal, makeStateKey } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { IApiResponse } from '../../models/ApiResponse';
import { IProblemTag } from '../../../modules/home/models/question-tag';
import { tap, finalize, of } from 'rxjs';

const TAGS_STATE_KEY = makeStateKey<IProblemTag[]>('problem-tags');

export interface IQuestionTagDto {
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProblemTagService {
  private readonly api = environment.apiUrl + '/public';
  private readonly http = inject(HttpClient);

  private readonly _problemTags = signal<IProblemTag[]>([]);
  public isLoading = signal<boolean>(false); // Progress bar state
  public hasLoaded = signal<boolean>(false); // Cache state

  // Read-only access for components
  public problemTags = this._problemTags.asReadonly();

  fetchProblemTags(force: boolean = false) {
    if (this.hasLoaded() && !force) {
      return of(this._problemTags());
    }

    this.isLoading.set(true);
    return this.http.get<IProblemTag[]>(`${this.api}/problem-tags`).pipe(
      tap((res) => {
        this._problemTags.set(res);
        this.hasLoaded.set(true);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  addProblemTag(payload: IQuestionTagDto) {
    return this.http.post<IProblemTag>(`${this.api}/problem-tags`, null, {
      params: { tagName: payload.name },
    });
  }

  updateProblemTag(tagId: number, payload: IQuestionTagDto) {
    return this.http.put<IApiResponse<IProblemTag>>(
      `${this.api}/problem-tags/${tagId}`,
      {},
      {
        params: { tagName: payload.name },
      },
    );
  }

  upsertTagSignal(tag: IProblemTag): void {
    const current = this._problemTags();
    const index = current.findIndex((item) => item.id === tag.id);

    if (index === -1) {
      this._problemTags.set([...current, tag]);
    } else {
      this._problemTags.set(current.map((item) => (item.id === tag.id ? tag : item)));
    }
    this.hasLoaded.set(true);
  }

  removeTagSignal(tagId: number): void {
    this._problemTags.set(this._problemTags().filter((item) => item.id !== tagId));
  }
}
