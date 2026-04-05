import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ISubmission, ISubmissionResult } from '../models/submission';

@Injectable({
  providedIn: 'root',
})
export class SubmissionService {
  private readonly api = environment.apiUrl;
  private readonly http = inject(HttpClient);

  submitCode(data: ISubmission) {
    return this.http.post<ISubmissionResult>(`${this.api}/submissions/submit`, data);
  }
}
