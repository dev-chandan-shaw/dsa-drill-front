import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { RightPaneService } from '../../services/right-pane-service';
import { CommonModule } from '@angular/common';

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

  navItems: NavItem[] = [
    {
      label: 'Home',
      route: '/home',
      icon: 'pi pi-home',
    },
  ];

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
