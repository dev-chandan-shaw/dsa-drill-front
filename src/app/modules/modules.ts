import {
  Component,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Header } from '../shared/components/header/header';
import { Sidebar } from '../shared/components/sidebar/sidebar';
import { NotePane } from './library/personal/note-pane';
import { PaneSide, RightPaneService, RightPaneSize } from '../shared/services/right-pane-service';

@Component({
  selector: 'app-modules',
  imports: [RouterOutlet, Header, Sidebar, NotePane],
  templateUrl: './modules.html',
  styleUrl: './modules.scss',
})
export class Modules implements OnInit {
  @ViewChild('sidebarTemplate') sidebarTemplate!: TemplateRef<any>;
  readonly rightPaneService = inject(RightPaneService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private sidebarBeforeEditor: boolean | null = null;

  // Default to desktop for SSR; update on the client once we know the width.
  readonly isMobile = signal(false);

  showSidebar = signal(true);

  ngOnInit(): void {
    this.updateSidebarForRoute(this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => this.updateSidebarForRoute(event.urlAfterRedirects));

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isMobile.set(globalThis.innerWidth < 768);
  }

  private updateSidebarForRoute(url: string): void {
    const isArticleEditor = /^\/admin\/articles\/[^/]+\/edit\/?$/.test(url.split(/[?#]/)[0]);
    if (isArticleEditor && this.sidebarBeforeEditor === null) {
      this.sidebarBeforeEditor = this.showSidebar();
      this.showSidebar.set(false);
      this.rightPaneService.close();
    } else if (!isArticleEditor && this.sidebarBeforeEditor !== null) {
      this.showSidebar.set(this.sidebarBeforeEditor);
      this.sidebarBeforeEditor = null;
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
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
