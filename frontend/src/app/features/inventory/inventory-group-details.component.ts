import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InventoryApiService, type InventoryLot } from '../../core/inventory-api.service';

@Component({
  selector: 'dv-inventory-group-details',
  imports: [RouterLink, DatePipe],
  template: `
    <section class="screen">
      <header class="hero compact">
        <div class="hero-top">
          <a class="back" routerLink="/inventory" aria-label="Back">‹</a>
          <div><div class="brand">DRAGON-VIEW</div><h1>Grouped Inventory Details</h1></div>
          <span></span>
        </div>
      </header>
      <div class="content">
        <article class="card group-summary">
          <div>
            <small>Fruit category</small>
            <h2>{{ format(size) }} · Grade {{ grade }}</h2>
          </div>
          <div class="total"><strong>{{ totalPieces() }}</strong><span>total available pieces</span></div>
        </article>
        <div class="section-heading heading">
          <h2>Contributing FIFO Lots</h2>
          <span>Oldest first · {{ lots().length }} batch{{ lots().length === 1 ? '' : 'es' }}</span>
        </div>
        <div class="lot-list">
          @for (lot of lots(); track lot.id) {
            <a class="card lot" [routerLink]="['/inventory', lot.id]">
              <span class="order">{{ $index + 1 }}</span>
              <div><strong>#{{ lot.batchNumber }}</strong><small>Harvested {{ lot.harvestDate | date:'mediumDate' }}</small></div>
              <div class="quantity"><strong>{{ lot.availablePieces }}</strong><small>pieces</small></div>
              <span class="open">View lot →</span>
            </a>
          } @empty {
            <article class="card empty">{{ message() || 'No active lots found.' }}</article>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .compact{padding-bottom:22px}.back{color:white;text-decoration:none;font-size:30px}
    .group-summary{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:24px}.group-summary h2{margin:5px 0 0}.group-summary small{color:var(--muted)}
    .total{display:grid;text-align:right}.total strong{color:var(--magenta);font-size:32px}.total span{color:var(--muted);font-size:12px}.heading{margin-top:26px}
    .lot-list{display:grid;gap:12px}.lot{display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;padding:17px;color:inherit;text-decoration:none}.lot:hover{border-color:var(--magenta);background:var(--magenta-soft)}
    .order{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;color:var(--magenta);background:var(--magenta-soft);font-weight:900}.lot div{display:grid;gap:3px}.lot small{color:var(--muted)}.quantity{text-align:right}.quantity strong{font-size:18px}.open{color:var(--magenta);font-size:12px;font-weight:800}.empty{padding:24px;color:var(--muted)}
    @media(max-width:600px){.group-summary{align-items:flex-start}.lot{grid-template-columns:auto 1fr auto}.open{grid-column:2/-1}.total strong{font-size:25px}}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryGroupDetailsComponent {
  private readonly api = inject(InventoryApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly size = this.route.snapshot.paramMap.get('size') as InventoryLot['size'];
  protected readonly grade = this.route.snapshot.paramMap.get('grade') as InventoryLot['grade'];
  protected readonly lots = signal<InventoryLot[]>([]);
  protected readonly message = signal('');

  constructor() {
    this.api.list(this.grade, this.size).subscribe({
      next: ({ data }) => this.lots.set(
        data.filter((lot) => lot.size === this.size && lot.grade === this.grade),
      ),
      error: () => this.message.set('Grouped inventory could not be loaded.'),
    });
  }

  protected totalPieces(): number {
    return this.lots().reduce((total, lot) => total + lot.availablePieces, 0);
  }
  protected format(value: string): string {
    return value.replace('_', '-').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
