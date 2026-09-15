import { Component, inject, OnInit } from '@angular/core';
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

  ngOnInit(): void {
    // Match the Material Icons Outlined font loaded in index.html so every
    // <mat-icon> ligature resolves to a glyph (default is filled 'material-icons').
    this.iconRegistry.setDefaultFontSetClass('material-icons-outlined');
    this.themeService.init();
    this.authService.loadCurrentUser().subscribe();
  }
}
