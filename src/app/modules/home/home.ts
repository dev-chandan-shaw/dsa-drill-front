import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { RouterModule } from '@angular/router';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { MenuModule } from 'primeng/menu';
import { PopoverModule } from 'primeng/popover';
import { CardModule } from 'primeng/card';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ISheet } from './models/sheet';
import { ProblemTagService } from './services/question-tag.service';
import { ProblemService } from './services/question.service';
import { ProblemStatusApiService } from './services/question-status-api.service';
import { ProblemPatternService } from './services/problem-pattern.service';
import { IUserQuestionStatus, UserQuestionStatusDto } from './models/Question-status';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { Divider } from 'primeng/divider';

@Component({
  selector: 'app-home',
  imports: [
    TagModule,
    ButtonModule,
    TooltipModule,
    RouterModule,
    ProgressBarModule,
    NgTemplateOutlet,
    DialogModule,
    Select,
    MenuModule,
    PopoverModule,
    CardModule,
    FormsModule,
    ReactiveFormsModule,
    ProblemList,
    Divider,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly formBuilder = new FormBuilder();
  private readonly questionTagService = inject(ProblemTagService);
  private readonly questionService = inject(ProblemService);
  private readonly questionStatusService = inject(ProblemStatusApiService);
  private readonly problemPatternService = inject(ProblemPatternService);

  addToSheetForm = this.formBuilder.group({
    categoryId: [''],
  });

  isGroupedByPattern = signal(false);
  categories = this.questionTagService.problemTags;
  sheets = signal<ISheet[]>([
    {
      id: 1,
      name: 'Sheet 1',
    },
  ]);
  questions = this.questionService.problems;
  questionStatuses = this.questionStatusService.problemStatuses;
  selectedSheet = signal(1);
  selectedCategory = signal(1);
  expandedGroups: { [patternId: number]: boolean } = {};

  toggleMarkForRevision(problemId: number) {
    const isMarked = !this.questionStatuses()[problemId]?.revision;
    const status: UserQuestionStatusDto = {
      problemId: problemId,
      revision: isMarked,
    };
    this.questionStatuses()[problemId] = {
      ...this.questionStatuses()[problemId],
      revision: isMarked,
    } as IUserQuestionStatus;
    this.questionStatusService.updateProblemStatus(status).subscribe();
  }

  toggleSolved(problemId: number) {
    const isSolved = !this.questionStatuses()[problemId]?.solved;
    const status: UserQuestionStatusDto = {
      problemId: problemId,
      solved: isSolved,
    };
    this.questionStatuses()[problemId] = {
      ...this.questionStatuses()[problemId],
      solved: isSolved,
    } as IUserQuestionStatus;
    this.questionStatusService.updateProblemStatus(status).subscribe();
  }

  togglePatternGroup(patternId: number) {
    this.expandedGroups[patternId] = !this.expandedGroups[patternId];
  }
}
