import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { RightPaneContainer } from './shared/components/right-pane-container/right-pane-container';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, Toast, RightPaneContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('dsa-drill-front');
}
