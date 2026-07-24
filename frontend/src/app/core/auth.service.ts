import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: 'OWNER_ADMIN' | 'STAFF_FARMER';
}

interface LoginResponse {
  data: { token: string; user: SessionUser };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'dragon-view-token';
  private readonly userKey = 'dragon-view-user';
  private readonly currentUser = signal<SessionUser | null>(this.readUser());

  readonly user = this.currentUser.asReadonly();
  readonly authenticated = computed(() => Boolean(this.token && this.currentUser()));

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap(({ data }) => {
        localStorage.setItem(this.tokenKey, data.token);
        localStorage.setItem(this.userKey, JSON.stringify(data.user));
        this.currentUser.set(data.user);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
    void this.router.navigateByUrl('/login');
  }

  private readUser(): SessionUser | null {
    try {
      const stored = localStorage.getItem(this.userKey);
      return stored ? JSON.parse(stored) as SessionUser : null;
    } catch {
      return null;
    }
  }
}
