import { Component, effect, inject, input, signal, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RightPaneService } from '../../services/right-pane-service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth/auth.service';
import { SavedProblemSheetService } from '../../services/public-api/saved-problem-sheet.service';
import { IProblemSheetDetails } from '../../../modules/home/models/problem-sheet';
import { ToastService } from '../../services/toast-service';
import { FormPaneTemplate } from '../form-pane-template/form-pane-template';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { concatMap, finalize } from 'rxjs';
import { ProblemSheetService } from '../../services/public-api/problem-sheet.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, FormPaneTemplate],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  showHeader = input(true);
  readonly router = inject(Router);
  private readonly rightPaneService = inject(RightPaneService);
  private readonly authService = inject(AuthService);
  private readonly problemSheetService = inject(ProblemSheetService);
  private readonly savedProblemSheetService = inject(SavedProblemSheetService);
  private readonly toastService = inject(ToastService);
  private readonly isAdmin = this.authService.isAdmin();
  @ViewChild('sheetFormTemplate') sheetFormTemplate!: TemplateRef<any>;

  sheetForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
  });
  readonly isSheetSaving = signal(false);

  readonly problemSheets = this.problemSheetService.problemSheets;
  readonly hasLoadedSheets = this.problemSheetService.hasLoaded;
  readonly isSheetAccordionOpen = signal(false);

  readonly savedProblemSheets = this.savedProblemSheetService.problemSheets;
  readonly hasLoadedSavedSheets = this.savedProblemSheetService.hasLoaded;
  readonly isSavedAccordionOpen = signal(false);
  readonly isLoggedIn = this.authService.isLoggedIn();

  navItems = signal([
    {
      label: 'Library',
      route: '/home',
      icon: 'library_books',
    },
    {
      label: 'Pattern',
      route: '/question-pattern',
      icon: 'account_tree',
    },
  ]);

  constructor() {
    if (this.router.url.startsWith('/problems-sheet/')) {
      this.isSheetAccordionOpen.set(true);
      this.isSavedAccordionOpen.set(true);
    }

    effect(() => {
      if (this.isAdmin()) {
        this.navItems.update((items) =>
          items.some((item) => item.route === '/admin')
            ? items
            : [...items, { label: 'Admin', route: '/admin', icon: 'settings' }],
        );
      }
    });

    effect(() => {
      if (this.isSheetAccordionOpen() && !this.hasLoadedSheets() && this.isLoggedIn()) {
        this.problemSheetService.fetchProblemSheets();
      }
    });

    effect(() => {
      if (this.isSavedAccordionOpen() && !this.hasLoadedSavedSheets() && this.isLoggedIn()) {
        this.savedProblemSheetService.fetchProblemSheets();
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

  toggleSavedAccordion() {
    this.isSavedAccordionOpen.update((v) => !v);
  }

  openSheetForm() {
    this.rightPaneService.open(this.sheetFormTemplate);
  }

  navigateToSheet(sheetId: string) {
    this.isSheetAccordionOpen.set(true);
    this.router.navigate(['/problems-sheet', sheetId]);
    this.rightPaneService.close();
  }

  navigateToSavedSheet(sheetId: string) {
    this.isSavedAccordionOpen.set(true);
    this.router.navigate(['/problems-sheet', sheetId]);
    this.rightPaneService.close();
  }

  isSheetActive(sheetId: string): boolean {
    return this.router.url === `/problems-sheet/${sheetId}`;
  }

  isSavedSheetActive(sheetId: string): boolean {
    return this.router.url.startsWith(`/problems-sheet/${sheetId}`);
  }

  onSheetCreated() {
    if (!this.sheetForm.valid) {
      return;
    }
    this.isSheetSaving.set(true);
    const sheet: IProblemSheetDetails = {
      title: this.sheetForm.value.name ?? '',
      problemIds: [],
      isPublic: false,
      isOwner: true,
      id: '',
    };
    this.problemSheetService
      .createProblemSheet(sheet)
      .pipe(
        finalize(() => this.isSheetSaving.set(false)),
        concatMap(() => this.problemSheetService.fetchProblemSheets()),
      )
      .subscribe({
        next: () => {
          this.toastService.showSuccess('Sheet created successfully');
          this.rightPaneService.close();
          this.sheetForm.reset();
          this.router.navigate([
            '/problems-sheet',
            this.problemSheets()[this.problemSheets().length - 1].id,
          ]);
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
