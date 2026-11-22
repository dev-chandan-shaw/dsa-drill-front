import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-workspace', imports: [RouterOutlet],
  template: `
    <section class="admin-main" aria-label="Admin workspace"><router-outlet /></section>
  `,
  styleUrls: ['../library/library.scss', './admin-workspace.scss'],
})
export class AdminWorkspace {}
