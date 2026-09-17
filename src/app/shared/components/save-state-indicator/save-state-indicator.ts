import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

// Bottom-left save status for auto-saving panes (notes, pattern add/edit).
// Idle renders nothing; every other state announces politely for SR users.
@Component({
  selector: 'app-save-state-indicator',
  imports: [DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './save-state-indicator.html',
  styleUrl: './save-state-indicator.scss',
})
export class SaveStateIndicator {
  readonly state = input<SaveState>('idle');
  readonly savedAt = input<Date | null>(null);
  readonly retry = output<void>();
}
