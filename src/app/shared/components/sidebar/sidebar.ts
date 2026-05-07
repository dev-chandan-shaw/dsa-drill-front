import { Component, effect, inject, input, signal, TemplateRef, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RightPaneService, RightPaneSize } from '../../services/right-pane-service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ProblemSheetService } from '../../services/public-api/problem-sheet.service';
import { ProblemSheetForm } from '../problem-sheet-form/problem-sheet-form';
import { IProblemSheetDetails } from '../../../modules/home/models/problem-sheet';
import { ToastService } from '../../services/toast-service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, ProblemSheetForm],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  showHeader = input(true);
  readonly router = inject(Router);
  private readonly rightPaneService = inject(RightPaneService);
  private readonly authService = inject(AuthService);
  private readonly problemSheetService = inject(ProblemSheetService);
  private readonly toastService = inject(ToastService);
  private readonly isAdmin = this.authService.isAdmin();

  sheetFormTemplate = viewChild('sheetFormTemplate', { read: TemplateRef });

  readonly problemSheets = this.problemSheetService.problemSheets;
  readonly hasLoadedSheets = this.problemSheetService.hasLoaded;
  readonly isSheetAccordionOpen = signal(false);

  navItems = signal([
    {
      label: 'Library',
      route: '/home',
      icon: 'pi pi-book',
    },
    {
      label: 'Pattern',
      route: '/question-pattern',
      icon: 'pi pi-sitemap',
    },
  ]);

  constructor() {
    effect(() => {
      if (this.isAdmin()) {
        this.navItems.update((items) => [
          ...items,
          { label: 'Admin', route: '/admin', icon: 'pi pi-cog' },
        ]);
      }
    });

    effect(() => {
      if (this.isSheetAccordionOpen() && !this.hasLoadedSheets()) {
        this.problemSheetService.fetchProblemSheets();
      }
    });
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  navigate(route: string) {
    this.router.navigate([route]);
    this.rightPaneService.close();
  }

  toggleSheetAccordion() {
    this.isSheetAccordionOpen.update((v) => !v);
  }

  openSheetForm() {
    this.rightPaneService.open(this.sheetFormTemplate()!, RightPaneSize.LARGE, {
      title: 'Create New Sheet',
    });
  }

  navigateToSheet(sheetId: number) {
    this.router.navigate(['/problem-sheet', sheetId]);
    this.rightPaneService.close();
  }

  onSheetCreated(sheet: IProblemSheetDetails) {
    this.problemSheetService.createProblemSheet(sheet).subscribe({
      next: (createdSheet) => {
        this.toastService.showSuccess('Sheet created successfully');
        this.problemSheetService.fetchProblemSheets();
        this.rightPaneService.close();
      },
      error: () => {
        this.toastService.showError('Failed to create sheet');
      },
    });
  }

  closeSidebar() {
    this.rightPaneService.close();
  }
}
