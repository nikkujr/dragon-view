import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'dv-login',
  template: `
    <section class="login-screen">
      <form class="card login-card" (submit)="submit($event)">
        <div class="brand">DRAGON-VIEW</div>
        <h1>Welcome back</h1>
        <p>Sign in to manage farm operations.</p>
        <label>Email<input name="email" type="email" autocomplete="username" required></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
        <button type="submit" [disabled]="submitting()">{{ submitting() ? 'Signing in…' : 'Sign in' }}</button>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </form>
    </section>
  `,
  styles: `
    .login-screen { min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: var(--magenta-soft); }
    .login-card { width: min(100%, 390px); padding: 28px; }
    h1 { margin: 8px 0; } p { color: var(--muted); }
    label { display: grid; gap: 6px; margin-top: 16px; font-size: 13px; font-weight: 800; }
    input { padding: 13px; border: 1px solid var(--line); border-radius: 12px; font: inherit; }
    button { width: 100%; margin-top: 20px; padding: 13px; border: 0; border-radius: 13px; color: white; background: var(--magenta); font-weight: 800; }
    button:disabled { opacity: .65; } .error { color: var(--red); text-align: center; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    this.submitting.set(true);
    this.error.set('');
    this.auth.login(String(data.get('email')), String(data.get('password')))
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (error: unknown) => this.error.set(
          error instanceof HttpErrorResponse
            ? error.error?.error?.message ?? 'Unable to sign in.'
            : 'Unable to sign in.',
        ),
      });
  }
}
