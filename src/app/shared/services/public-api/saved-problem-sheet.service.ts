import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { IProblemSheetSummary } from '../../../modules/home/models/problem-sheet';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SavedProblemSheetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl + '/saved-problem-sheets';

  readonly problemSheets = signal<IProblemSheetSummary[]>([]);
  readonly hasLoaded = signal(false);

  isProblemSheetSaved(id: number) {
    return this.problemSheets().some((sheet) => sheet.id === id);
  }

  getAllProblemSheets() {
    return this.http.get<IProblemSheetSummary[]>(this.baseUrl);
  }

  saveProblemSheet(id: number) {
    return this.http
      .post<IProblemSheetSummary>(`${this.baseUrl}/${id}`, {})
      .pipe(tap(() => this.fetchProblemSheets()));
  }

  unsaveProblemSheet(id: number) {
    return this.http
      .delete<IProblemSheetSummary>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this.fetchProblemSheets()));
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
