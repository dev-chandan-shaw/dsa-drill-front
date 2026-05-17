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
import { InputTextModule } from 'primeng/inputtext';
import { concatMap, finalize } from 'rxjs';
import { ProblemSheetService } from '../../services/public-api/problem-sheet.service';
import { Divider } from 'primeng/divider';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, FormPaneTemplate, Divider],
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
      icon: 'pi pi-book',
    },
    {
      label: 'Pattern',
      route: '/question-pattern',
      icon: 'pi pi-sitemap',
    },
  ]);

  constructor() {
    if (this.router.url.startsWith('/problems-sheet/')) {
      this.isSheetAccordionOpen.set(true);
      this.isSavedAccordionOpen.set(true);
    }

    effect(() => {
      if (this.isAdmin()) {
        this.navItems.update((items) => [
          ...items,
          { label: 'Admin', route: '/admin', icon: 'pi pi-cog' },
        ]);
      }
    });

    effect(() => {
      if (this.isSheetAccordionOpen() && !this.hasLoadedSheets() && this.isLoggedIn()) {
        this.problemSheetService.fetchProblemSheets();
      }
    });

    effect(() => {
      if (this.isSavedAccordionOpen() && !this.hasLoadedSavedSheets() && this.isLoggedIn()) {
        console.log('fetching saved problem sheets', this.isLoggedIn());
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

  navigateToSheet(sheetId: number) {
    this.isSheetAccordionOpen.set(true);
    this.router.navigate(['/problems-sheet', sheetId]);
    this.rightPaneService.close();
  }

  navigateToSavedSheet(sheetId: number) {
    this.isSavedAccordionOpen.set(true);
    this.router.navigate(['/problems-sheet', sheetId]);
    this.rightPaneService.close();
  }

  isSheetActive(sheetId: number): boolean {
    return this.router.url === `/problems-sheet/${sheetId}`;
  }

  isSavedSheetActive(sheetId: number): boolean {
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
      id: 0,
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
