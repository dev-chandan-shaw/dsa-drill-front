import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { RightPaneService } from '../../services/right-pane-service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  showHeader = input(true);
  readonly router = inject(Router);
  private readonly rightPaneService = inject(RightPaneService);
  private readonly authService = inject(AuthService);
  private readonly isAdmin = this.authService.isAdmin();

  readonly navItems: NavItem[] = [
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
  ];

  constructor() {
    if (this.isAdmin()) {
      this.navItems.push({
        label: 'Admin',
        route: '/admin',
        icon: 'pi pi-shield',
      });
    }
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  navigate(route: string) {
    this.router.navigate([route]);
    this.rightPaneService.close();
  }

  closeSidebar() {
    this.rightPaneService.close();
  }
}
