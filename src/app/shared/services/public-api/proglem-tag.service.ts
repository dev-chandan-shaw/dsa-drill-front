import { inject, Injectable, signal, makeStateKey } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { IApiResponse } from '../../models/ApiResponse';
import { IProblemTag } from '../../../modules/home/models/question-tag';
import { tap, finalize } from 'rxjs';

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

  fetchProblemTags() {
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
}
