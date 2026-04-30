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

  // With this:
  readonly isMobile = signal(globalThis?.innerWidth < 768);

  showSidebar = signal(true);
  isLoaded = signal(false);

  private readonly questionTagService = inject(ProblemTagService);
  private readonly questionService = inject(ProblemService);
  private readonly questionStatusService = inject(ProblemStatusApiService);
  private readonly problemPatternService = inject(ProblemPatternService);
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    // Load all data after user logs in
    forkJoin([
      this.questionTagService.fetchProblemTags(),
      this.questionService.fetchProblems(),
      this.questionStatusService.fetchProblemStatuses(),
      this.problemPatternService.fetchProblemPatterns(),
    ]).subscribe({
      next: () => {
        this.isLoaded.set(true);
      },
      error: (err) => {
        console.error('Data loading error:', err);
        // this.toastService.showError('Failed to load data. Please refresh.');
        // this.isLoaded.set(true); // unblock the UI so it's not frozen
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
