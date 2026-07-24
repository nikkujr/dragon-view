import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { InventoryApiService, type InventoryLot } from '../../core/inventory-api.service';

@Component({
  selector: 'dv-harvests',
  template: `
    <section class="screen">
      <header class="hero">
        <div class="hero-top">
          <button class="icon-button" type="button" aria-label="Open menu">☰</button>
          <div><div class="brand">DRAGON-VIEW</div><h1>Harvest Records</h1></div>
          <button class="icon-button" type="button" aria-label="Notifications">●</button>
        </div>
        <div class="hero-pills">
          <span class="pill">18 harvests</span>
          <span class="pill">248 pieces</span>
          <span class="pill">All done</span>
        </div>
        <input class="search harvest-search" placeholder="Search harvest ID or date" aria-label="Search harvests">
      </header>
      <div class="content">
        <div class="section-heading"><h2>Recent Harvests</h2><span>Sort by date</span></div>
        <div class="record-list">
          @for (harvest of harvests(); track harvest.id) {
            <article class="card record">
              <span class="record-icon">⚘</span>
              <div>
                <strong>{{ harvest.id }}</strong>
                <small>{{ harvest.pieces }} pieces · {{ harvest.date }}</small>
              </div>
              <span class="badge completed">Completed</span>
            </article>
          }
        </div>
      </div>
      <button class="floating-action" type="button" aria-label="Add harvest" (click)="openForm()">+</button>

      @if (formOpen()) {
        <div class="modal-backdrop" (click)="closeForm()">
          <form class="card harvest-form" (submit)="addHarvest($event)" (click)="$event.stopPropagation()">
            <div class="section-heading">
              <h2>Record Harvest</h2>
              <button class="close-button" type="button" aria-label="Close" (click)="closeForm()">×</button>
            </div>
            <label>
              Batch number
              <input name="batchNumber" required maxlength="40" placeholder="H-2026-050">
            </label>
            <label>
              Harvest date
              <input name="harvestDate" type="date" required>
            </label>
            <div class="form-row">
              <label>
                Fruit size
                <select name="size" required>
                  <option>Extra-Small</option>
                  <option>Small</option>
                  <option selected>Medium</option>
                  <option>Large</option>
                  <option>Jumbo</option>
                </select>
              </label>
              <label>
                Grade
                <select name="grade" required>
                  <option value="A">A — Good Quality</option>
                  <option value="B">B — OK</option>
                  <option value="C">C — Blemished</option>
                </select>
              </label>
            </div>
            <label>
              Number of pieces
              <input name="pieces" type="number" min="1" step="1" required>
            </label>
            <button class="primary-action" type="submit" [disabled]="submitting()">
              {{ submitting() ? 'Saving…' : 'Save harvest' }}
            </button>
            @if (message()) {
              <p class="form-message" role="status">{{ message() }}</p>
            }
          </form>
        </div>
      }
    </section>
  `,
  styles: `
    .harvest-search { position: relative; z-index: 1; margin-top: 14px; }
    .completed { color: var(--green); background: var(--green-soft); }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgb(24 18 23 / 55%);
    }
    .harvest-form {
      width: min(100%, 430px);
      padding: 20px;
    }
    .harvest-form label {
      display: grid;
      gap: 6px;
      margin-top: 14px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    .harvest-form input, .harvest-form select {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: white;
      font: inherit;
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .close-button { border: 0; background: transparent; font-size: 26px; cursor: pointer; }
    .primary-action {
      width: 100%;
      margin-top: 18px;
      padding: 13px;
      border: 0;
      border-radius: 14px;
      color: white;
      background: var(--magenta);
      font-weight: 800;
      cursor: pointer;
    }
    .primary-action:disabled { opacity: .65; }
    .form-message { margin: 12px 0 0; color: var(--green); text-align: center; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HarvestsComponent implements OnInit {
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly router = inject(Router);
  protected readonly formOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly message = signal('');
  protected readonly harvests = signal([
    { id: '#H-2026-045', pieces: 210, date: 'Jul 02, 2026' },
    { id: '#H-2026-046', pieces: 175, date: 'Jul 08, 2026' },
    { id: '#H-2026-047', pieces: 320, date: 'Jul 13, 2026' },
    { id: '#H-2026-048', pieces: 145, date: 'Jul 17, 2026' },
    { id: '#H-2026-049', pieces: 290, date: 'Jul 21, 2026' },
  ]);

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('add') === '1') {
      this.openForm();
    }
  }

  protected openForm(): void {
    this.message.set('');
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected addHarvest(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const batchNumber = String(data.get('batchNumber')).replace(/^#/, '');
    const harvestDate = String(data.get('harvestDate'));
    const size = String(data.get('size')).toUpperCase().replace('-', '_') as InventoryLot['size'];
    const grade = String(data.get('grade')) as InventoryLot['grade'];
    const pieces = Number(data.get('pieces'));

    this.submitting.set(true);
    this.message.set('');
    this.inventoryApi.registerHarvest({
      batchNumber,
      harvestDate,
      items: [{ size, grade, pieces }],
    }).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => void this.router.navigateByUrl('/inventory'),
      error: (error: unknown) => {
        const message = error instanceof HttpErrorResponse
          ? error.error?.error?.message
          : undefined;
        this.message.set(message ?? 'The harvest could not be saved.');
      },
    });
  }
}
