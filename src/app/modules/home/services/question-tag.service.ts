import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { IApiResponse } from '../../../shared/models/ApiResponse';
import { IProblemTag } from '../models/question-tag';
import { tap } from 'rxjs';

export interface IQuestionTagDto {
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProblemTagService {
  private readonly api = environment.apiUrl;
  private readonly http = inject(HttpClient);

  private readonly _problemTags = signal<IProblemTag[]>([]);
  public readonly problemTags = this._problemTags.asReadonly();

  fetchProblemTags() {
    return this.http
      .get<IProblemTag[]>(`${this.api}/problem-tags`)
      .pipe(tap((res) => this._problemTags.set(res)));
  }

  addProblemTag(payload: IQuestionTagDto) {
    return this.http
      .post<IProblemTag>(`${this.api}/problem-tags`, null, {
        params: { tagName: payload.name },
      })
      .pipe(tap((res) => this._problemTags.update((tags) => [...tags, res])));
  }

  updateProblemTag(tagId: number, payload: IQuestionTagDto) {
    return this.http
      .put<IApiResponse<IProblemTag>>(
        `${this.api}/problem-tags/${tagId}`,
        {},
        {
          params: { tagName: payload.name },
        },
      )
      .pipe(
        tap((res) =>
          this._problemTags.update((tags) =>
            tags.map((tag) => (tag.id === tagId ? res.data : tag)),
          ),
        ),
      );
  }
}
