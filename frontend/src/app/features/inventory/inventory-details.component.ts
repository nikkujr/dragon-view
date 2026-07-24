import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, type Observable } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import {
  InventoryApiService,
  type InventoryDetails,
} from '../../core/inventory-api.service';

@Component({
  selector: 'dv-inventory-details',
  imports: [RouterLink, SlicePipe],
  template: `
    <section class="screen">
      <header class="hero compact">
        <div class="hero-top">
          <a class="icon-button back" routerLink="/inventory" aria-label="Back">‹</a>
          <div><div class="brand">DRAGON-VIEW</div><h1>Inventory Details</h1></div>
          <span></span>
        </div>
      </header>
      <div class="content">
        @if (loading()) {
          <article class="card state">Loading inventory details…</article>
        } @else if (error()) {
          <article class="card state error">{{ error() }}</article>
        } @else if (lot(); as item) {
          <div class="details-grid" [class.single]="!isOwner()">
            <article class="card detail-card">
              <div class="detail-header">
                <span class="lot-icon">{{ item.grade }}</span>
                <div><small>Harvest batch</small><h2>#{{ item.batchNumber }}</h2></div>
                <span class="badge grade-badge" [class.grade-a]="item.grade === 'A'" [class.grade-b]="item.grade === 'B'" [class.grade-c]="item.grade === 'C'">Grade {{ item.grade }}</span>
              </div>
              <div class="facts">
                <div><small>Available quantity</small><strong>{{ item.availablePieces }} <em>pieces</em></strong></div>
                <div><small>Fruit size</small><strong>{{ format(item.size) }}</strong></div>
                <div><small>Harvest date</small><strong>{{ item.harvestDate | slice:0:10 }}</strong></div>
              </div>
            </article>

            @if (isOwner()) {
            <article class="card action-card">
              <div class="card-title"><div><small>Restricted controls</small><h2>Owner/Admin Actions</h2></div><span class="lock">◆</span></div>
              <form class="action-panel" (submit)="adjust($event)">
                <div class="action-copy"><strong>Adjust quantity</strong><small>Use a negative number to reduce stock.</small></div>
                <label>Quantity change<input name="pieces" type="number" step="1" required placeholder="e.g. -2 or 5"></label>
                <label>Reason<input name="reason" minlength="3" maxlength="255" required></label>
                <button type="submit" [disabled]="saving()">Save adjustment</button>
              </form>
              @if (item.grade !== 'C') {
                <form class="action-panel regrade-panel" (submit)="regrade($event)">
                  <div class="action-copy"><strong>Regrade inventory</strong><small>Grade A may move to B or C. Grade B may move to C.</small></div>
                  <label>Target grade
                    <select name="targetGrade" required>
                      @if (item.grade === 'A') { <option value="B">Grade B — OK</option> }
                      <option value="C">Grade C — Blemished</option>
                    </select>
                  </label>
                  <label>Pieces to regrade<input name="pieces" type="number" min="1" [max]="item.availablePieces" required></label>
                  <label>Reason<input name="reason" minlength="3" maxlength="255" required></label>
                  <button type="submit" [disabled]="saving()">Apply regrading</button>
                </form>
              }
              @if (message()) { <p class="message" role="status">{{ message() }}</p> }
            </article>
            }
          </div>

          <div class="section-heading history-heading"><h2>Transaction History</h2><span>Oldest first</span></div>
          <div class="record-list">
            @for (transaction of item.transactions; track transaction.id) {
              <article class="card transaction">
                <span class="transaction-icon" [class.out]="transaction.pieces < 0">{{ transaction.pieces < 0 ? '↓' : '↑' }}</span>
                <div><strong>{{ label(transaction.type) }}</strong><small>{{ transaction.createdBy }} · {{ transaction.createdAt | slice:0:10 }}</small></div>
                <strong class="quantity" [class.negative]="transaction.pieces < 0">{{ transaction.pieces > 0 ? '+' : '' }}{{ transaction.pieces }} pcs</strong>
                @if (transaction.remarks) { <small class="remarks">{{ transaction.remarks }}</small> }
              </article>
            } @empty {
              <article class="card state">No transactions recorded.</article>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .compact { padding-bottom: 22px; } .back { color: white; text-decoration: none; font-size: 30px; }
    .state, .detail-card, .action-card { padding: 22px; } .error, .negative { color: var(--red); }
    .details-grid { display: grid; grid-template-columns: minmax(300px, .8fr) minmax(520px, 1.2fr); gap: 16px; align-items: start; }
    .details-grid.single { grid-template-columns: minmax(0, 700px); }
    .detail-header, .card-title { display: flex; align-items: center; gap: 12px; }
    .detail-header > div, .card-title > div { flex: 1; }
    .detail-header h2, .card-title h2 { margin: 3px 0 0; }
    .lot-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 15px; color: white; background: var(--magenta); font-size: 20px; font-weight: 900; }
    .grade-badge { padding: 7px 11px; } .grade-a { color: var(--green); background: var(--green-soft); }.grade-b { color: #a66d00; background: var(--amber-soft); }.grade-c { color: var(--red); background: var(--red-soft); }
    .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 22px; }
    .facts div { display: grid; gap: 6px; padding: 14px; border-radius: 12px; background: var(--background); }
    .facts strong { font-size: 16px; }.facts em { color: var(--muted); font-size: 11px; font-style: normal; } small { color: var(--muted); }
    .lock { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: var(--magenta); background: var(--magenta-soft); }
    .action-card form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: end; margin-top: 14px; padding: 14px; border: 1px solid var(--line); border-radius: 13px; }
    .action-copy { grid-column: 1 / -1; display: grid; gap: 4px; align-self: center; }.action-copy small { font-size: 11px; }
    .action-card form button { grid-column: 1 / -1; justify-self: end; min-width: 150px; }
    .action-card input { width: 100%; }
    .regrade-panel { background: #fffbf2; }
    label { display: grid; gap: 5px; color: var(--muted); font-size: 12px; font-weight: 700; }
    input, select { min-width: 0; padding: 11px; border: 1px solid var(--line); border-radius: 10px; background: white; font: inherit; }
    button { padding: 11px 13px; border: 0; border-radius: 10px; color: white; background: var(--magenta); font-weight: 800; }
    .message { padding: 10px; border-radius: 10px; color: var(--magenta); background: var(--magenta-soft); } .history-heading { margin-top: 26px; }
    .transaction { display: grid; grid-template-columns: auto 1fr auto; gap: 7px 12px; align-items: center; padding: 16px; }
    .transaction-icon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: var(--green); background: var(--green-soft); font-weight: 900; }.transaction-icon.out { color: var(--red); background: var(--red-soft); }
    .transaction div { display: grid; gap: 3px; }.quantity { white-space: nowrap; color: var(--green); } .remarks { grid-column: 2 / -1; }
    @media (max-width: 1150px) { .details-grid { grid-template-columns: 1fr; } }
    @media (max-width: 620px) { .facts, .action-card form { grid-template-columns: 1fr; }.action-copy { grid-column: auto; }.action-card form button { grid-column: auto; justify-self: stretch; width: 100%; }.detail-header { align-items: flex-start; }.transaction { grid-template-columns: auto 1fr; }.quantity { grid-column: 2; }.remarks { grid-column: 2; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryDetailsComponent {
  private readonly api = inject(InventoryApiService);
  private readonly auth = inject(AuthService);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  protected readonly lot = signal<InventoryDetails | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly isOwner = () => this.auth.user()?.role === 'OWNER_ADMIN';

  constructor() { this.load(); }

  protected adjust(event: SubmitEvent): void {
    const values = this.values(event);
    if (!values) return;
    this.run(this.api.adjust(this.id, values.pieces, values.reason), 'Inventory adjustment saved.');
  }
  protected regrade(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const targetGrade = String(data.get('targetGrade')) as 'B' | 'C';
    this.run(
      this.api.regrade(
        this.id,
        targetGrade,
        Number(data.get('pieces')),
        String(data.get('reason')),
      ),
      `Inventory regraded to Grade ${targetGrade}.`,
    );
  }
  protected format(value: string): string { return value.replace('_', '-'); }
  protected label(value: string): string { return value.replaceAll('_', ' '); }

  private values(event: SubmitEvent): { pieces: number; reason: string } | null {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return null;
    const data = new FormData(form);
    return { pieces: Number(data.get('pieces')), reason: String(data.get('reason')) };
  }
  private run(request: Observable<unknown>, message: string): void {
    this.saving.set(true); this.message.set('');
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.message.set(message); this.load(); },
      error: (error: unknown) => this.message.set(
        error instanceof HttpErrorResponse ? error.error?.error?.message ?? 'Operation failed.' : 'Operation failed.',
      ),
    });
  }
  private load(): void {
    this.api.details(this.id).subscribe({
      next: ({ data }) => { this.lot.set(data); this.loading.set(false); },
      error: () => { this.error.set('Inventory details could not be loaded.'); this.loading.set(false); },
    });
  }
}
