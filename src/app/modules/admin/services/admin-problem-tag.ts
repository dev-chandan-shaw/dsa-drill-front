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
      params: { tagName: payload.name },
    });
  }

  editProblemTag(tagId: number, payload: IQuestionTagDto) {
    return this.http.put<IApiResponse<IProblemTag>>(
      `${this.api}/problem-tags/${tagId}`,
      {},
      {
        params: { tagName: payload.name },
      },
    );
  }

  deleteProblemTag(tagId: number) {
    return this.http.delete<void>(`${this.api}/problem-tags/${tagId}`);
  }
}
