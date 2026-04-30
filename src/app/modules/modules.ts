import {
  Component,
  HostListener,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../shared/components/header/header';
import { Sidebar } from '../shared/components/sidebar/sidebar';
import { PaneSide, RightPaneService, RightPaneSize } from '../shared/services/right-pane-service';
import { forkJoin } from 'rxjs';
import { ProblemTagService } from './home/services/question-tag.service';
import { ProblemService } from './home/services/question.service';
import { ProblemStatusApiService } from './home/services/question-status-api.service';
import { ProblemPatternService } from './home/services/problem-pattern.service';
import { ToastService } from '../shared/services/toast-service';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-modules',
  imports: [RouterOutlet, Header, Sidebar, ProgressBarModule],
  templateUrl: './modules.html',
  styleUrl: './modules.scss',
})
export class Modules implements OnInit {
  @ViewChild('sidebarTemplate') sidebarTemplate!: TemplateRef<any>;
  readonly rightPaneService = inject(RightPaneService);
  readonly isMobile = signal(globalThis.innerWidth < 768);
  showSidebar = signal(true);
  isLoading = signal(true);

  private readonly questionTagService = inject(ProblemTagService);
  private readonly questionService = inject(ProblemService);
  private readonly questionStatusService = inject(ProblemStatusApiService);
  private readonly problemPatternService = inject(ProblemPatternService);
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    // Load all data after user logs in
    this.isLoading.set(true);
    forkJoin([
      this.questionTagService.fetchProblemTags(),
      this.questionService.fetchProblems(),
      this.questionStatusService.fetchProblemStatuses(),
      this.problemPatternService.fetchProblemPatterns(),
    ]).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Data loading error:', err);
        // this.toastService.showError('Error loading data', 'Please refresh the page');
        this.isLoading.set(false);
      },
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(globalThis.innerWidth < 768);
  }

  toggleSidebar() {
    if (this.isMobile()) {
      this.rightPaneService.open(this.sidebarTemplate, RightPaneSize.MOBILE, {
        side: PaneSide.LEFT,
      });
    } else {
      this.showSidebar.set(!this.showSidebar());
    }
  }
}
