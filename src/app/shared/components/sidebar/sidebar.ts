import { Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { RightPaneService } from '../../services/right-pane-service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LIBRARY_CATALOG } from '../../../modules/library/library-catalog';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterLinkActive, RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  showHeader = input(true);
  readonly router = inject(Router);
  private readonly rightPaneService = inject(RightPaneService);
  private readonly authService = inject(AuthService);
  readonly isAdmin = this.authService.isAdmin();

  readonly subjects = LIBRARY_CATALOG;
  readonly adminSections = [
    { title: 'Articles', path: '/admin/articles', icon: 'article' },
    { title: 'Questions', path: '/admin/questions', icon: 'code' },
    { title: 'Tags', path: '/admin/tags', icon: 'sell' },
  ];

  isRouteActive(route: string): boolean {
    const url = this.router.url.split('?')[0];
    if (route === '/library') return url === route;
    return url === route || url.startsWith(`${route}/`);
  }

  isSubjectActive(code: string): boolean {
    const url = this.router.url.split('?')[0];
    return url === `/library/${code}` || url.startsWith(`/library/${code}/`);
  }

  navigate() {
    this.rightPaneService.close();
  }

  closeSidebar() {
    this.rightPaneService.close();
  }
}
