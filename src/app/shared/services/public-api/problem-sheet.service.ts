import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import {
  IProblemSheetDetails,
  IProblemSheetSummary,
} from '../../../modules/home/models/problem-sheet';

@Injectable({
  providedIn: 'root',
})
export class ProblemSheetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/problem-sheets';
  private readonly publicBaseUrl = environment.apiUrl + '/public/problem-sheets';

  readonly problemSheets = signal<IProblemSheetSummary[]>([]);
  readonly hasLoaded = signal(false);

  getAllProblemSheets() {
    return this.http.get<IProblemSheetSummary[]>(this.baseUrl);
  }

  getProblemSheetById(id: number) {
    return this.http.get<IProblemSheetDetails>(`${this.publicBaseUrl}/${id}`);
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

  createProblemSheet(payLoad: IProblemSheetDetails) {
    return this.http.post<IProblemSheetDetails>(this.baseUrl, payLoad);
  }

  updateProblemSheet(payLoad: IProblemSheetDetails) {
    return this.http.put<IProblemSheetDetails>(this.baseUrl, payLoad);
  }
}
