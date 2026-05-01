import { Component, computed, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { RouterModule } from '@angular/router';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { PopoverModule } from 'primeng/popover';
import { CardModule } from 'primeng/card';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProblemTagService } from '../../shared/services/public-api/proglem-tag.service';
import { PublicProblemService } from '../../shared/services/public-api/problem.service';
import { ProblemList } from '../../shared/components/problem-list/problem-list';
import { Divider } from 'primeng/divider';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProblemStatusApiService } from './services/user/question-status-api.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [
    TagModule,
    ButtonModule,
    TooltipModule,
    RouterModule,
    ProgressBarModule,
    DialogModule,
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
export class Home implements OnInit {
  private readonly questionTagService = inject(ProblemTagService);
  private readonly questionService = inject(PublicProblemService);
  private readonly authService = inject(AuthService);
  private readonly questionStatusService = inject(ProblemStatusApiService);
  private readonly platformId = inject(PLATFORM_ID);

  problems = this.questionService.problems;
  tags = this.questionTagService.problemTags;

  hasLoaded = computed(
    () => this.questionService.hasLoaded() && this.questionTagService.hasLoaded(),
  );

  ngOnInit(): void {
    this.questionService.fetchProblems().subscribe();
    this.questionTagService.fetchProblemTags().subscribe();
    if (isPlatformBrowser(this.platformId)) {
      this.questionStatusService.fetchProblemStatuses().subscribe();
    }
  }
}
