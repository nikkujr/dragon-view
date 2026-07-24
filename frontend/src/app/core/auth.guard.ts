import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.authenticated() ? true : inject(Router).createUrlTree(['/login']);
};

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.authenticated()) return inject(Router).createUrlTree(['/login']);
  return auth.user()?.role === 'OWNER_ADMIN'
    ? true
    : inject(Router).createUrlTree(['/sales']);
};
