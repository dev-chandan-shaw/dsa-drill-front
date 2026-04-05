import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { inject } from '@angular/core';

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getLoggedInUser();

  if (user()) {
    router.navigate(['/home']);
    return false;
  }

  // User not logged in — allow access
  return true;
};
