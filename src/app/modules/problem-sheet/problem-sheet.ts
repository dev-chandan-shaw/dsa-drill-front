import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { IProblem } from '../home/models/Question';
import { IUserQuestionStatus } from '../home/models/Question-status';
import { ProblemService } from '../home/services/question.service';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-problem-sheet',
  imports: [ProblemList, Card],
  templateUrl: './problem-sheet.html',
  styleUrl: './problem-sheet.scss',
})
export class ProblemSheet implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly questionService = inject(ProblemService);
  problems = signal<IProblem[]>([]);
  questionStatuses = signal<{ [questionId: number]: IUserQuestionStatus }>({});

  ngOnInit() {
    const sheetId = this.route.snapshot.paramMap.get('sheetId');
    if (sheetId) {
      this.questionService
        .getProblemsByTag(sheetId)
        .subscribe((questions) => this.problems.set(questions));
    }
  }
}
