import { Component, HostListener, inject, PLATFORM_ID } from '@angular/core';
import { RightPaneService, RightPaneSize, PaneSide } from '../../services/right-pane-service';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-right-pane-container',
  imports: [NgTemplateOutlet],
  templateUrl: './right-pane-container.html',
  styleUrl: './right-pane-container.scss',
})
export class RightPaneContainer {
  isMobile = false;
  readonly rightPaneService = inject(RightPaneService);
  readonly PaneSide = PaneSide;
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = globalThis.innerWidth < 768;
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = globalThis.innerWidth < 768;
    }
  }

  get width() {
    if (this.isMobile) {
      return this.rightPaneService.side === PaneSide.LEFT ? '210px' : '100%';
    }
    switch (this.rightPaneService.size) {
      case RightPaneSize.MOBILE:
        return '280px';
      case RightPaneSize.SMALL:
        return '500px';
      case RightPaneSize.MEDIUM:
        return '700px';
      case RightPaneSize.LARGE:
        return '900px';
      default:
        return '700px';
    }
  }
}
