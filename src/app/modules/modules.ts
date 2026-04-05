import { Component, HostListener, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../shared/components/header/header';
import { Sidebar } from '../shared/components/sidebar/sidebar';
import { PaneSide, RightPaneService, RightPaneSize } from '../shared/services/right-pane-service';

@Component({
  selector: 'app-modules',
  imports: [RouterOutlet, Header, Sidebar],
  templateUrl: './modules.html',
  styleUrl: './modules.scss',
})
export class Modules {
  @ViewChild('sidebarTemplate') sidebarTemplate!: TemplateRef<any>;
  readonly rightPaneService = inject(RightPaneService);
  readonly isMobile = signal(globalThis.innerWidth < 768);
  showSidebar = signal(true);

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
