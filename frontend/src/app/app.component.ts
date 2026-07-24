import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'dv-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (onLoginPage()) {
      <router-outlet />
    } @else {
      <main class="app-shell">
        <section class="app-viewport">
        <router-outlet />
        <nav class="bottom-nav" aria-label="Primary navigation">
          <div class="nav-brand">
            <span class="nav-logo">DV</span>
            <div><strong>DRAGON-VIEW</strong><small>Farm Management</small></div>
          </div>
          @for (item of navigation; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.path === '/' }"
              [attr.aria-label]="item.label"
            >
              <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
          <button class="nav-logout" type="button" (click)="logout()">Sign out</button>
        </nav>
        </section>
      </main>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly onLoginPage = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.startsWith('/login')),
      startWith(this.router.url.startsWith('/login')),
    ),
    { initialValue: this.router.url.startsWith('/login') },
  );
  protected readonly navigation = [
    { path: '/', label: 'Dashboard', icon: '⌂' },
    { path: '/inventory', label: 'Inventory', icon: '▣' },
    { path: '/sales', label: 'Sales', icon: '₱' },
    { path: '/classification', label: 'Camera', icon: '●' },
    { path: '/planting', label: 'Planting', icon: '⚘' },
  ];
  protected logout(): void { this.auth.logout(); }
}
