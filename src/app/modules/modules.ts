import {
  Component,
  HostListener,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
export class Modules implements OnInit {
  @ViewChild('sidebarTemplate') sidebarTemplate!: TemplateRef<any>;
  readonly rightPaneService = inject(RightPaneService);
  private readonly platformId = inject(PLATFORM_ID);

  // Default to desktop for SSR; update on the client once we know the width.
  readonly isMobile = signal(false);

  showSidebar = signal(true);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isMobile.set(globalThis.innerWidth < 768);
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
