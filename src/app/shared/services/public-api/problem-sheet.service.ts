import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  IProblemSheetDetails,
  IProblemSheetSummary,
} from '../../../modules/home/models/problem-sheet';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProblemSheetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/problem-sheets';

  readonly problemSheets = signal<IProblemSheetSummary[]>([]);
  readonly hasLoaded = signal(false);

  getAllProblemSheets() {
    return this.http.get<IProblemSheetSummary[]>(this.baseUrl).pipe();
  }

  getProblemSheetById(id: number) {
    return this.http.get<IProblemSheetDetails>(`${this.baseUrl}/${id}`);
  }

  createProblemSheet(dto: IProblemSheetDetails) {
    return this.http.post<IProblemSheetDetails>(this.baseUrl, dto);
  }

  updateProblemSheet(dto: IProblemSheetDetails) {
    return this.http.put<IProblemSheetDetails>(this.baseUrl, dto);
  }

  fetchProblemSheets() {
    return new Promise<void>((resolve) => {
      this.getAllProblemSheets().subscribe((sheets) => {
        this.problemSheets.set(sheets);
        this.hasLoaded.set(true);
        resolve();
      });
    });
  }
}
