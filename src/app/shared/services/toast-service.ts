import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

// Signature-compatible replacement for the PrimeNG MessageService wrapper:
// all existing showSuccess/showError/showInfo call sites keep working.
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  showSuccess(summary: string, detail?: string): void {
    this.snackBar.open(this.format(summary, detail), 'Dismiss', {
      duration: 4000,
      panelClass: ['dsa-snackbar', 'dsa-snackbar-success'],
    });
  }

  showError(summary: string, detail?: string): void {
    this.snackBar.open(this.format(summary, detail), 'Dismiss', {
      duration: 8000,
      panelClass: ['dsa-snackbar', 'dsa-snackbar-error'],
    });
  }

  showInfo(summary: string, detail?: string): void {
    this.snackBar.open(this.format(summary, detail), 'Dismiss', {
      duration: 4000,
      panelClass: ['dsa-snackbar', 'dsa-snackbar-info'],
    });
  }

  private format(summary: string, detail?: string): string {
    return detail ? `${summary}: ${detail}` : summary;
  }
}
