import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { AuthService } from '../services/auth/auth.service';
import { finalize } from 'rxjs';
import { ToastService } from '../../shared/services/toast-service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    FloatLabelModule,
    CommonModule,
    InputTextModule,
    RouterModule,
    InputGroupModule,
    InputGroupAddonModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = signal(false);
  isGoogleLoading = signal(false);

  private readonly _fb = inject(FormBuilder);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _authService = inject(AuthService);
  private readonly _toastService = inject(ToastService);

  constructor() {
    this.loginForm = this._fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
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
    this.isGoogleLoading.set(true);
    globalThis.location.href = environment.googleOAuthRedirectUrl;
  }
}
