import { Component, HostListener, inject, PLATFORM_ID } from '@angular/core';
import { RightPaneService, RightPaneSize, PaneSide } from '../../services/right-pane-service';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';

// Slide-over host rebuilt on MatSidenav. The RightPaneService API is unchanged
// (open(template, size, {title, context, side}) / close()), so every call site
// keeps working while gaining backdrop click-to-close and Escape handling.
//
// Focus is managed by the sidenav itself (native autofocus + trap + restore
// for over-mode drawers) — deliberately no second trap here, since competing
// focus managers fight over focus and scroll the page mid-animation.
//
// Close lifecycle (prevents mid-animation side flips and reopen flicker):
//  1. close() only flips isOpen — position/template/title are kept so the
//     slide-out runs from the correct edge with content intact.
//  2. User-initiated dismiss (Escape/backdrop) syncs via openedChange.
//  3. completeClose() clears state once the animation ends (closed).
@Component({
  selector: 'app-right-pane-container',
  imports: [NgTemplateOutlet, MatSidenavModule],
  templateUrl: './right-pane-container.html',
  styleUrl: './right-pane-container.scss',
})
export class RightPaneContainer {
  isMobile = false;
  readonly rightPaneService = inject(RightPaneService);
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

  get position(): 'start' | 'end' {
    return this.rightPaneService.side === PaneSide.LEFT ? 'start' : 'end';
  }

  get hasContent(): boolean {
    return this.rightPaneService.template !== undefined;
  }

  get width() {
    if (this.isMobile) {
      return this.rightPaneService.side === PaneSide.LEFT ? 'min(320px, 100%)' : '100%';
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

  onOpenedChange(opened: boolean) {
    // User-initiated dismiss (Escape/backdrop) starts closing internally;
    // sync the service immediately so no change-detection cycle re-asserts
    // opened=true mid-animation (reopen flicker).
    if (!opened) {
      this.rightPaneService.close();
    }
  }

  onClosed() {
    this.rightPaneService.completeClose();
  }
}
