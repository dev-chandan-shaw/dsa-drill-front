import { Injectable } from '@angular/core';
import { IProblem } from '../models/Question';

// question-drill.service.ts
@Injectable({ providedIn: 'root' })
export class ProblemDrillService {
  private remaining: IProblem[] = [];
  private initial: IProblem[] = [];
  cyclesCompleted = 0;

  init(questions: IProblem[]) {
    this.remaining = this.shuffle([...questions]);
    this.initial = [...questions];
    this.cyclesCompleted = 0;
  }

  next(): IProblem | null {
    if (this.initial.length === 0) return null;

    if (this.remaining.length === 0) {
      this.remaining = this.shuffle([...this.initial]);
      this.cyclesCompleted++;
    }

    return this.remaining.pop() ?? null;
  }

  private shuffle(arr: IProblem[]): IProblem[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
