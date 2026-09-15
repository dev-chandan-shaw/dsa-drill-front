import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { map, Observable } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog';

// PrimeNG ConfirmationService replacement with the same confirm-then-act shape.
// Emits true when the user accepts, false otherwise.
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);

  confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialog, {
        data,
        width: '400px',
        maxWidth: 'calc(100dvw - 32px)',
      })
      .afterClosed()
      .pipe(map((result) => result === true));
  }
}
