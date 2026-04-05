import { isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuestionService } from '../home/services/question.service';
import { EditorComponent } from '../../shared/components/editor-component/editor-component';
import { IQuestion } from '../home/models/Question';
import { SubmissionService } from './service/submission.service';
import { ISubmission, ISubmissionResult } from './models/submission';
import { TestCaseComponent } from './components/test-case/test-case';
import { ProblemDescriptionComponent } from './components/problem-description/problem-description';
import { SplitterModule } from 'primeng/splitter';
import { ProgressBarModule } from 'primeng/progressbar';
import { finalize, take } from 'rxjs';

@Component({
  selector: 'app-problem-workspace',
  imports: [
    EditorComponent,
    TestCaseComponent,
    ProblemDescriptionComponent,
    SplitterModule,
    ProgressBarModule,
  ],
  templateUrl: './problem-workspace.html',
  styleUrl: './problem-workspace.scss',
})
export class ProblemWorkspace implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly questionService = inject(QuestionService);
  private readonly submissionService = inject(SubmissionService);
  private readonly platformId = inject(PLATFORM_ID);

  question = signal<IQuestion | null>(null);
  submissionResult = signal<ISubmissionResult | null>(null);
  testCases = computed(() => this.question()?.testCases ?? []);
  isLoading = signal(true);
  isSubmitting = signal(false);
  readonly horizontalPanelSizes = [30, 70];
  readonly verticalPanelSizes = [65, 35];

  slug = '';

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug');
    this.slug = slug || '';
    console.log(slug);
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading.set(false);
      return;
    }

    this.questionService
      .getQuestionBySlug(this.slug)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        take(1),
      )
      .subscribe((questions) => this.question.set(questions));
  }

  onSubmitCode(data: ISubmission) {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.submissionService
      .submitCode(data)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        take(1),
      )
      .subscribe((result) => {
        this.submissionResult.set(this.normalizeSubmissionResult(result));
      });
  }

  private normalizeSubmissionResult(
    payload: ISubmissionResult | { data?: ISubmissionResult },
  ): ISubmissionResult {
    if ('data' in payload && payload.data) {
      return payload.data;
    }

    return payload as ISubmissionResult;
  }
}
