import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly messageService = inject(MessageService);
  showSuccess(summary: string, detail?: string): void {
    this.messageService.add({ severity: 'success', summary, detail });
  }
  showError(summary: string, detail?: string): void {
    this.messageService.add({
      severity: 'error',
      summary,
      detail,
      sticky: true,
    });
  }
  showInfo(summary: string, detail?: string): void {
    this.messageService.add({ severity: 'info', summary, detail });
  }
}
