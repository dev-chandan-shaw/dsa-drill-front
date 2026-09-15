import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { IProblem } from '../../home/models/Question';

@Injectable({
  providedIn: 'root',
})
export class AdminProblemService {
  private readonly apiUrl = environment.apiUrl + '/admin';
  private readonly http = inject(HttpClient);

  addProblem(payload: IProblem) {
    return this.http.post<IProblem>(`${this.apiUrl}/problems`, payload);
  }

  editProblem(payload: IProblem) {
    const url = `${this.apiUrl}/problems`;
    return this.http.put<IProblem>(url, payload);
  }

  deleteProblem(problemId: number) {
    return this.http.delete<void>(`${this.apiUrl}/problems/${problemId}`);
  }
}
