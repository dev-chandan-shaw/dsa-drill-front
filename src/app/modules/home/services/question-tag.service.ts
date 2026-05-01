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
import { environment } from '../../../../environments/environment';
import { IApiResponse } from '../../../shared/models/ApiResponse';
import { IProblemTag } from '../models/question-tag';
import { tap, of } from 'rxjs';

const TAGS_STATE_KEY = makeStateKey<IProblemTag[]>('problem-tags');

export interface IQuestionTagDto {
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProblemTagService {
  private readonly api = environment.apiUrl;
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);

  private readonly _problemTags = signal<IProblemTag[]>([]);
  public readonly problemTags = this._problemTags.asReadonly();

  fetchProblemTags() {
    const cached = this.transferState.get(TAGS_STATE_KEY, null as IProblemTag[] | null);

    if (cached) {
      if (isPlatformBrowser(this.platformId)) {
        this.transferState.remove(TAGS_STATE_KEY);
      }
      this._problemTags.set(cached);
      return of(cached);
    }

    return this.http.get<IProblemTag[]>(`${this.api}/problem-tags`).pipe(
      tap((res) => {
        this._problemTags.set(res);
        this.transferState.set(TAGS_STATE_KEY, res);
      }),
    );
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
