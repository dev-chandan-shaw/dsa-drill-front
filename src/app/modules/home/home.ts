import { NgTemplateOutlet, NgClass, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
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
import { ICategory } from './models/category';
import { ISheet } from './models/sheet';
import { CategoryService } from './services/category.service';
import { QuestionService } from './services/question.service';
import { IQuestion } from './models/Question';
import { QuestionStatusApiService } from './services/question-status-api.service';
import { IUserQuestionStatus, UserQuestionStatusDto } from './models/Question-status';
import { ToastService } from '../../shared/services/toast-service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [
    TagModule,
    ButtonModule,
    TooltipModule,
    RouterModule,
    ProgressBarModule,
    NgTemplateOutlet,
    NgClass,
    DialogModule,
    Select,
    MenuModule,
    PopoverModule,
    CardModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly formBuilder = new FormBuilder();
  private readonly categoryService = inject(CategoryService);
  private readonly questionService = inject(QuestionService);
  private readonly questionStatusService = inject(QuestionStatusApiService);
  private readonly toastService = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  isLoading = signal(true);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.categoryService.getCategories().subscribe((categories) => {
      this.categories.set(categories);
    });

    forkJoin([
      this.questionService.getQuestions(),
      this.questionStatusService.getAllQuestionStatuses(),
    ]).subscribe(([questions, questionStatuses]) => {
      this.questions.set(questions);
      this.questionStatuses = questionStatuses.reduce(
        (acc, status) => {
          acc[status.id] = status;
          return acc;
        },
        {} as { [questionId: number]: IUserQuestionStatus },
      );
      this.isLoading.set(false);
    });
  }

  addToSheetForm = this.formBuilder.group({
    categoryId: [''],
  });

  isGroupedByPattern = signal(false);
  categories = signal<ICategory[]>([]);
  sheets = signal<ISheet[]>([
    {
      id: 1,
      name: 'Sheet 1',
    },
  ]);
  questions = signal<IQuestion[]>([]);
  questionStatuses: { [questionId: number]: IUserQuestionStatus } = {};
  selectedSheet = signal(1);
  selectedCategory = signal(1);
  expandedGroups: { [patternId: number]: boolean } = {};

  toggleMarkForRevision(problemId: number) {
    const isMarked = !this.questionStatuses[problemId]?.isMarkedForRevision;
    const status: UserQuestionStatusDto = {
      questionId: problemId,
      isMarkedForRevision: isMarked,
    };
    this.questionStatuses[problemId] = {
      ...this.questionStatuses[problemId],
      isMarkedForRevision: isMarked,
    } as IUserQuestionStatus;
    this.questionStatusService.updateQuestionStatus(status).subscribe({
      next: (res) => {
        console.log('Question marked for revision successfully');
      },
      error: (err) => {
        console.error('Error marking question for revision:', err);
      },
    });
  }

  toggleSolved(problemId: number) {
    const isSolved = !this.questionStatuses[problemId]?.isSolved;
    const status: UserQuestionStatusDto = {
      questionId: problemId,
      isSolved: isSolved,
    };
    this.questionStatuses[problemId] = {
      ...this.questionStatuses[problemId],
      isSolved: isSolved,
    } as IUserQuestionStatus;
    this.questionStatusService.updateQuestionStatus(status).subscribe({
      next: (res) => {
        console.log('Question marked for revision successfully');
      },
      error: (err) => {
        console.error('Error marking question for revision:', err);
      },
    });
  }

  togglePatternGroup(patternId: number) {
    this.expandedGroups[patternId] = !this.expandedGroups[patternId];
  }
}
