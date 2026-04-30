import { Component, EventEmitter, Output, TemplateRef, ViewChild, inject } from '@angular/core';
import { RightPaneService } from '../../services/right-pane-service';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { StorageService } from '../../../core/services/storage.service';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-header',
  imports: [CommonModule, Sidebar, ButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  host: {
    ngSkipHydration: 'true',
  },
})
export class Header {
  @ViewChild('sidebarTemplate') sidebarTemplate!: TemplateRef<any>;
  readonly rightPaneService = inject(RightPaneService);
  private readonly storageService = inject(StorageService);
  private readonly router = inject(Router);
  @Output() toggleSidebar = new EventEmitter<void>();

  get userInitial(): string {
    const user = this.storageService.get('loggedInUser');
    if (user) {
      try {
        const userData = JSON.parse(user);
        const nameSource = userData.firstName || userData.name || userData.email || '';
        return nameSource ? nameSource.charAt(0).toUpperCase() : 'U';
      } catch {
        return 'U';
      }
    }
    return 'U';
  }

  navigateToHome() {
    this.router.navigateByUrl('/');
  }
}
