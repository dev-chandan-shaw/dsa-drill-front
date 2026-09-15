import { inject, Injectable } from '@angular/core';
import { IProblemPatternDto } from '../../../shared/services/public-api/problem-pattern.service';
import { Observable } from 'rxjs';
import { IProblemPattern } from '../../home/models/problem-pattern';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminProblemPatternService {
  private readonly api = environment.apiUrl + '/admin';
  private readonly http = inject(HttpClient);

  addProblemPattern(payload: Omit<IProblemPatternDto, 'id'>): Observable<IProblemPattern> {
    return this.http.post<IProblemPattern>(`${this.api}/problem-patterns`, payload);
  }

  editProblemPattern(payload: IProblemPatternDto): Observable<IProblemPattern> {
    return this.http.post<IProblemPattern>(`${this.api}/problem-patterns`, payload);
  }

  deleteProblemPattern(patternId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/problem-patterns/${patternId}`);
  }
}
