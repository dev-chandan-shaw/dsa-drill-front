import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { IApiResponse } from '../../../shared/models/ApiResponse';
import { Observable } from 'rxjs';
import { IAddQuestionDto, IQuestion } from '../models/Question';

@Injectable({
  providedIn: 'root',
})
export class QuestionService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getQuestions(): Observable<IQuestion[]> {
    return this.http.get<IQuestion[]>(`${this.apiUrl}/problems`);
  }

  getQuestionBySlug(slug: string): Observable<IQuestion> {
    return this.http.get<IQuestion>(`${this.apiUrl}/problems/slug/${slug}`);
  }

  updateQuestion(
    questionId: number,
    question: Partial<IAddQuestionDto>,
  ): Observable<IApiResponse<IQuestion>> {
    const url = `${this.apiUrl}/question/${questionId}`;
    return this.http.put<IApiResponse<IQuestion>>(url, question);
  }
}
