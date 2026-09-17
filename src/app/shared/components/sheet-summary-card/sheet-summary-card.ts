import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

// Shared tag/sheet summary card (problem-sheet + custom-problem-sheet).
// Presentational only: counts flow in via inputs, all markup/styling lives
// here so the two pages never drift. Only real data is shown — there is no
// backend for saved counts, updated dates, attempting counts, or Discuss,
// and the Practice action row was removed per design review.
@Component({
  selector: 'app-sheet-summary-card',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './sheet-summary-card.html',
  styleUrl: './sheet-summary-card.scss',
})
export class SheetSummaryCard {
  readonly title = input('');
  readonly total = input(0);
  readonly easyTotal = input(0);
  readonly mediumTotal = input(0);
  readonly hardTotal = input(0);
  readonly solvedTotal = input(0);
  readonly solvedEasy = input(0);
  readonly solvedMedium = input(0);
  readonly solvedHard = input(0);
  readonly solvedPercent = input(0);

  readonly clampedPercent = computed(() =>
    Math.min(100, Math.max(0, Math.round(this.solvedPercent()))),
  );

  // Donut geometry (r=60): dash offset derived from the clamped percent.
  readonly ringCircumference = 2 * Math.PI * 60;
  readonly ringOffset = computed(
    () => this.ringCircumference * (1 - this.clampedPercent() / 100),
  );
}
