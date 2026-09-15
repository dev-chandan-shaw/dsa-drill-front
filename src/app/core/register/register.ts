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
import { IRegisterRequest } from '../../shared/models/User';
import { finalize } from 'rxjs';
import { ToastService } from '../../shared/services/toast-service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnInit {
  registerForm: FormGroup;
  showPassword = false;
  isLoading = signal(false);
  isGoogleLoading = signal(false);
  readonly isCompletingOAuth: Signal<boolean>;

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  constructor() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
    this.isCompletingOAuth = this.authService.isCompletingOAuth;
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.authService.handleOAuthReturn({
      error: params.get('error'),
      message: params.get('msg'),
    });
  }

  submitForm(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const value = this.registerForm.value;

    const payload: IRegisterRequest = {
      email: value.email,
      firstName: value.firstName,
      lastName: value.lastName,
      password: value.password,
    };

    this.authService
      .register(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.toastService.showSuccess('Signup successful', 'Your account has been created.');
          this.router.navigateByUrl('/home');
        },
        error: (error) => {
          const detail =
            error?.error?.message || error?.message || 'Please review the form and try again.';
          this.toastService.showError('Signup failed', detail);
        },
      });
  }

  signupWithGoogle(): void {
    if (this.isLoading() || this.isGoogleLoading()) {
      return;
    }
    this.isGoogleLoading.set(true);
    globalThis.location.href = environment.googleOAuthRedirectUrl;
  }
}
