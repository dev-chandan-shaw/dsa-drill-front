import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { RightPaneContainer } from './shared/components/right-pane-container/right-pane-container';
import { AuthService } from './core/services/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, Toast, RightPaneContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('dsa-drill-front');
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    this.authService.loadCurrentUser().subscribe();
  }
}
