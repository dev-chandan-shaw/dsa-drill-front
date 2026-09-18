import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { IApiResponse } from '../../../shared/models/ApiResponse';
import { IQuestionTagDto } from '../../../shared/services/public-api/proglem-tag.service';
import { IProblemTag } from '../../home/models/question-tag';

@Injectable({
  providedIn: 'root',
})
export class AdminProblemTagService {
  private readonly api = environment.apiUrl + '/admin';
  private readonly http = inject(HttpClient);

  addProblemTag(payload: IQuestionTagDto) {
    return this.http.post<IProblemTag>(`${this.api}/problem-tags`, null, {
      params: this.coverParams(payload),
    });
  }

  editProblemTag(tagId: number, payload: IQuestionTagDto) {
    return this.http.put<IApiResponse<IProblemTag>>(
      `${this.api}/problem-tags/${tagId}`,
      {},
      {
        params: this.coverParams(payload),
      },
    );
  }

  private coverParams(payload: IQuestionTagDto): Record<string, string> {
    const params: Record<string, string> = { tagName: payload.name };
    const coverFrom = payload.coverFrom?.trim();
    const coverTo = payload.coverTo?.trim();
    const coverGlyph = payload.coverGlyph?.trim();
    if (coverFrom) {
      params['coverFrom'] = coverFrom;
    }
    if (coverTo) {
      params['coverTo'] = coverTo;
    }
    if (coverGlyph) {
      params['coverGlyph'] = coverGlyph;
    }
    return params;
  }

  deleteProblemTag(tagId: number) {
    return this.http.delete<void>(`${this.api}/problem-tags/${tagId}`);
  }
}
