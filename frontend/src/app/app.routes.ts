import { Routes } from '@angular/router';
import { authGuard, ownerGuard } from './core/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'inventory',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inventory/inventory.component').then((m) => m.InventoryComponent),
  },
  {
    path: 'inventory/group/:size/:grade',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inventory/inventory-group-details.component').then(
        (m) => m.InventoryGroupDetailsComponent,
      ),
  },
  {
    path: 'inventory/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/inventory/inventory-details.component').then(
        (m) => m.InventoryDetailsComponent,
      ),
  },
  {
    path: 'harvests',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/harvests/harvests.component').then((m) => m.HarvestsComponent),
  },
  {
    path: 'classification',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/classification/classification.component').then(
        (m) => m.ClassificationComponent,
      ),
  },
  {
    path: 'planting',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/planting/planting.component').then((m) => m.PlantingComponent),
  },
  {
    path: 'planting/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/planting/planting-details.component').then((m) => m.PlantingDetailsComponent),
  },
  {
    path: 'sales',
    pathMatch: 'full',
    canActivate: [authGuard],
    data: { salesMode: 'history' },
    loadComponent: () =>
      import('./features/sales/sales.component').then((m) => m.SalesComponent),
  },
  {
    path: 'sales/new',
    canActivate: [authGuard],
    data: { salesMode: 'checkout' },
    loadComponent: () =>
      import('./features/sales/sales.component').then((m) => m.SalesComponent),
  },
  {
    path: 'sales/prices',
    canActivate: [authGuard, ownerGuard],
    data: { salesMode: 'prices' },
    loadComponent: () =>
      import('./features/sales/sales.component').then((m) => m.SalesComponent),
  },
  {
    path: 'sales/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/sales/sale-details.component').then((m) => m.SaleDetailsComponent),
  },
  {
    path: 'analytics',
    canActivate: [authGuard, ownerGuard],
    loadComponent: () =>
      import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
