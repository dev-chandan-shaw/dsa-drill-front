import {
  Component,
  EventEmitter,
  Output,
  TemplateRef,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { RightPaneService } from '../../services/right-pane-service';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';

@Component({
  selector: 'app-header',
  imports: [CommonModule, Sidebar, ButtonModule, MenuModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @ViewChild('sidebarTemplate') sidebarTemplate!: TemplateRef<any>;
  @ViewChild('profileMenu') profileMenu!: Menu;
  readonly rightPaneService = inject(RightPaneService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  @Output() toggleSidebar = new EventEmitter<void>();
  readonly loggedInUser = this.authService.getLoggedInUser();
  readonly isLoggedIn = computed(() => !!this.loggedInUser());
  readonly isAuthResolved = this.authService.getAuthResolved();
  readonly isAuthLoading = this.authService.getAuthLoading();

  userFullName = computed(() => {
    const user = this.loggedInUser();
    if (user) {
      const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
      return fullName || user.email || 'User';
    }
    return 'User';
  });

  get userInitial(): string {
    const user = this.loggedInUser();
    if (user) {
      const nameSource = user.firstName || user.lastName || user.email || '';
      return nameSource ? nameSource.charAt(0).toUpperCase() : 'U';
    }
    return 'U';
  }

  navigateToHome() {
    this.router.navigateByUrl('/');
  }

  logout() {
    this.authService.logout();
  }

  readonly menuitems = computed(() => {
    const user = this.loggedInUser();
    if (!user) {
      return [];
    }

    return [
      {
        label: this.userFullName(),
        disabled: true,
      },
      {
        label: user.email,
        disabled: true,
      },
      { separator: true },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
      },
    ];
  });

  navigateToLogin() {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url || '/' },
    });
  }
}
