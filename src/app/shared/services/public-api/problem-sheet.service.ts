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
    return this.http.get<IProblemSheetSummary[]>(this.baseUrl, {transferCache:false});
  }

  getProblemSheetById(id: string, authenticated = false) {
    return this.http.get<IProblemSheetDetails>(`${authenticated ? this.baseUrl : this.publicBaseUrl}/${encodeURIComponent(id)}`, {transferCache:!authenticated});
  }

  fetchProblemSheets() {
    return new Promise<void>((resolve, reject) => {
      this.getAllProblemSheets().subscribe({
        next: (sheets) => {
          this.problemSheets.set(sheets);
          this.hasLoaded.set(true);
          resolve();
        },
        error: (err) => reject(err),
      });
    });
  }

  createProblemSheet(payLoad: IProblemSheetDetails) {
    return this.http.post<IProblemSheetDetails>(this.baseUrl, { ...payLoad, isPublic: payLoad.isPublic === true });
  }

  updateProblemSheet(payLoad: IProblemSheetDetails) {
    return this.http.put<IProblemSheetDetails>(this.baseUrl, { ...payLoad, isPublic: payLoad.isPublic === true });
  }

  updateVisibility(id: string, shared: boolean) {
    return this.http.put<IProblemSheetDetails>(`${this.baseUrl}/${encodeURIComponent(id)}/visibility`, { shared });
  }
}
