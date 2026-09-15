import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import { RightPaneContainer } from './shared/components/right-pane-container/right-pane-container';
import { AuthService } from './core/services/auth/auth.service';
import { ThemeService } from './theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RightPaneContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly iconRegistry = inject(MatIconRegistry);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Match the Material Icons Outlined font loaded in index.html so every
    // <mat-icon> ligature resolves to a glyph (default is filled 'material-icons').
    this.iconRegistry.setDefaultFontSetClass('material-icons-outlined');
    this.themeService.init();
    // Revalidate only in the browser. On the server (SSR/prerender) there is no
    // user session to validate — a build-time 401 would bake a logged-out state
    // (Login button) into the prerendered HTML that every logged-in visitor sees
    // flash before hydration. Server output stays neutral (reserved placeholders);
    // the client revalidates on boot and the snapshot hydrates instantly.
    if (isPlatformBrowser(this.platformId)) {
      this.authService.loadCurrentUser().subscribe();
    }
  }
}
