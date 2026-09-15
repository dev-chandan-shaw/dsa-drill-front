import { Component, inject, OnInit, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../services/auth/auth.service';
import { finalize } from 'rxjs';
import { ToastService } from '../../shared/services/toast-service';
import { SeoService } from '../../shared/services/seo.service';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = signal(false);
  isGoogleLoading = signal(false);
  readonly isCompletingOAuth: Signal<boolean>;

  private readonly _fb = inject(FormBuilder);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _authService = inject(AuthService);
  private readonly _toastService = inject(ToastService);
  private readonly _seoService = inject(SeoService);

  constructor() {
    this.loginForm = this._fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
    this.isCompletingOAuth = this._authService.isCompletingOAuth;
  }

  ngOnInit(): void {
    this._seoService.setPageMeta({
      title: 'Login - DSA Drill',
      description: 'Log in to DSA Drill to track solved problems, save sheets, and continue your interview prep.',
      path: '/login',
      robots: 'noindex, follow',
    });
    const params = this._route.snapshot.queryParamMap;
    this._authService.handleOAuthReturn({
      error: params.get('error'),
      message: params.get('msg'),
    });
  }

  submitForm(): void {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      const formData = this.loginForm.value;

      this._authService
        .login(formData.email, formData.password)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this._toastService.showSuccess('Login successful', 'You have been signed in.');
            const returnUrl = this._route.snapshot.queryParamMap.get('returnUrl') || '/';
            this._router.navigateByUrl(returnUrl);
          },
          error: (error) => {
            const detail =
              error?.error?.message ||
              error?.message ||
              'Please check your credentials and try again.';
            this._toastService.showError('Login failed', detail);
          },
        });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  loginWithGoogle(): void {
    if (this.isLoading() || this.isGoogleLoading()) {
      return;
    }
    this.isGoogleLoading.set(true);
    globalThis.location.href = environment.googleOAuthRedirectUrl;
  }
}
