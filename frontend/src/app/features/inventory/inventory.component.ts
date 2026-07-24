import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InventoryApiService, type InventoryLot } from '../../core/inventory-api.service';

type GradeFilter = 'All' | 'A' | 'B' | 'C';

@Component({
  selector: 'dv-inventory',
  imports: [RouterLink],
  template: `
    <section class="screen">
      <header class="hero">
        <div class="hero-top">
          <button class="icon-button" type="button" aria-label="Open menu">☰</button>
          <div>
            <div class="brand">DRAGON-VIEW</div>
            <h1>Inventory</h1>
          </div>
          <button class="icon-button" type="button" aria-label="Notifications">●</button>
        </div>
        <div class="hero-pills">
          <span class="pill">▣ 24 batches</span>
          <span class="pill">● 248 pieces</span>
          <span class="pill">↗ +12%</span>
        </div>
      </header>

      <div class="content inventory-content">
        <section class="card inventory-matrix">
          <div class="section-heading">
            <div>
              <h2>Inventory by Size and Grade</h2>
              <span>Available pieces across all active batches</span>
            </div>
            <strong>{{ totalPieces() }} total pieces</strong>
          </div>
          <div class="matrix-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Fruit Size</th>
                  @for (grade of matrixGrades; track grade) {
                    <th scope="col">
                      <span [class]="'grade-heading matrix-grade-' + grade.toLowerCase()">
                        Grade {{ grade }}
                      </span>
                    </th>
                  }
                  <th scope="col">Row Total</th>
                </tr>
              </thead>
              <tbody>
                @for (size of matrixSizes; track size.value) {
                  <tr>
                    <th scope="row">{{ size.label }}</th>
                    @for (grade of matrixGrades; track grade) {
                      <td class="matrix-cell">
                        @if (quantity(size.value, grade) > 0) {
                          <a
                            [routerLink]="['/inventory/group', size.value, grade]"
                            [attr.aria-label]="'Open grouped inventory details for ' + size.label + ', Grade ' + grade"
                            [attr.title]="'View all batches for ' + size.label + ', Grade ' + grade"
                          >
                            <strong>{{ quantity(size.value, grade) }}</strong>
                            <small>View details →</small>
                          </a>
                        } @else {
                          <span class="empty-cell">0</span>
                        }
                      </td>
                    }
                    <td class="row-total">{{ sizeTotal(size.value) }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Grade Total</th>
                  @for (grade of matrixGrades; track grade) {
                    <td>{{ gradeTotal(grade) }}</td>
                  }
                  <td>{{ totalPieces() }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section class="card lots-panel">
          <div class="lots-heading">
            <div>
              <h2>FIFO Inventory Lots</h2>
              <p>Search and filter individual harvest lots · oldest stock appears first</p>
            </div>
            <span class="lot-count">{{ filteredLots().length }} lot{{ filteredLots().length === 1 ? '' : 's' }}</span>
          </div>

          <div class="inventory-controls">
            <input
              class="search inventory-search"
              type="search"
              placeholder="Search batch ID, size, or grade"
              aria-label="Search inventory lots"
              [value]="query()"
              (input)="setQuery($event)"
            >
            <div class="filter-row" aria-label="Filter inventory lots by grade">
              @for (grade of grades; track grade) {
                <button
                  type="button"
                  class="filter-chip"
                  [class.active]="selectedGrade() === grade"
                  (click)="selectedGrade.set(grade)"
                >
                  {{ grade === 'All' ? 'All Grades' : 'Grade ' + grade }}
                </button>
              }
            </div>
          </div>

          <div class="record-list lots-list">
            @if (loading()) {
              <div class="empty">Loading inventory…</div>
            } @else if (error()) {
              <div class="empty error">{{ error() }}</div>
            }
            @for (lot of filteredLots(); track lot.id) {
              <a class="record record-link lot-record" [routerLink]="['/inventory', lot.id]">
                <span class="record-icon">{{ lot.grade }}</span>
                <div>
                  <strong>#{{ lot.batchNumber }}</strong>
                  <small>{{ lot.availablePieces }} pieces · {{ formatSize(lot.size) }} · {{ formatDate(lot.harvestDate) }}</small>
                </div>
                <span class="badge" [class.grade-a]="lot.grade === 'A'" [class.grade-b]="lot.grade === 'B'" [class.grade-c]="lot.grade === 'C'">
                  Grade {{ lot.grade }}
                </span>
              </a>
            } @empty {
              <div class="empty">No inventory lots match this search and grade filter.</div>
            }
          </div>
        </section>
      </div>

      <a
        class="floating-action add-link"
        routerLink="/harvests"
        [queryParams]="{ add: 1 }"
        aria-label="Record harvest"
      >+</a>
    </section>
  `,
  styles: `
    .inventory-content {
      padding-top: 24px;
    }

    .inventory-matrix {
      margin-bottom: 24px;
      padding: 20px;
    }

    .inventory-matrix .section-heading {
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .inventory-matrix .section-heading div {
      display: grid;
      gap: 4px;
    }

    .inventory-matrix .section-heading strong {
      color: var(--magenta);
      white-space: nowrap;
    }

    .matrix-scroll {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 13px;
    }

    table {
      width: 100%;
      min-width: 620px;
      border-collapse: collapse;
      font-size: 13px;
    }

    th, td {
      padding: 13px 16px;
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      text-align: center;
    }

    th:last-child, td:last-child { border-right: 0; }
    tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
    thead th, tfoot th, tfoot td { background: var(--background); font-weight: 800; }
    thead th:first-child, tbody th, tfoot th { text-align: left; }
    tbody th { color: var(--ink); background: #fff; }
    tbody td { font-size: 15px; font-weight: 700; }
    .row-total, tfoot td { color: var(--magenta); }

    .matrix-cell { padding: 0; }
    .matrix-cell a {
      min-height: 64px;
      display: grid;
      place-content: center;
      gap: 3px;
      padding: 10px;
      color: var(--ink);
      text-decoration: none;
      transition: color .15s ease, background .15s ease;
    }
    .matrix-cell a:hover {
      color: var(--magenta);
      background: var(--magenta-soft);
    }
    .matrix-cell a:focus-visible {
      position: relative;
      z-index: 1;
      outline: 3px solid rgb(211 35 102 / 25%);
      outline-offset: -3px;
    }
    .matrix-cell a small {
      color: var(--muted);
      font-size: 9px;
      font-weight: 600;
    }
    .matrix-cell .empty-cell {
      min-height: 64px;
      display: grid;
      place-content: center;
      color: #c4c7ce;
      background: #fafafa;
    }

    .grade-heading {
      display: inline-block;
      padding: 5px 9px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .matrix-grade-a { color: var(--green); background: var(--green-soft); }
    .matrix-grade-b { color: #a66d00; background: var(--amber-soft); }
    .matrix-grade-c { color: var(--red); background: var(--red-soft); }

    .lots-panel {
      padding: 20px;
    }

    .lots-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .lots-heading h2 { margin: 0; font-size: 1.05rem; }
    .lots-heading p { margin: 5px 0 0; color: var(--muted); font-size: 12px; }
    .lot-count {
      flex: none;
      padding: 7px 10px;
      border-radius: 999px;
      color: var(--magenta);
      background: var(--magenta-soft);
      font-size: 11px;
      font-weight: 800;
    }

    .inventory-controls {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) auto;
      gap: 14px;
      align-items: center;
      margin: 18px 0;
      padding: 14px;
      border-radius: 13px;
      background: var(--background);
    }

    .inventory-search {
      border: 1px solid var(--line);
    }

    .inventory-controls .filter-row {
      padding: 0;
    }

    .lots-list {
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    }

    .lot-record {
      border: 1px solid var(--line);
      border-radius: 13px;
      background: #fff;
      transition: border-color .15s ease, box-shadow .15s ease;
    }

    .lot-record:hover {
      border-color: rgb(211 35 102 / 35%);
      box-shadow: 0 6px 18px rgb(32 35 45 / 7%);
    }

    .grade-a {
      color: var(--green);
      background: var(--green-soft);
    }

    .grade-b {
      color: #b27600;
      background: var(--amber-soft);
    }

    .grade-c {
      color: var(--red);
      background: var(--red-soft);
    }

    .empty {
      padding: 30px;
      color: var(--muted);
      text-align: center;
    }
    .error { color: var(--red); }
    .record-link { color: inherit; text-decoration: none; }

    @media (max-width: 850px) {
      .inventory-controls { grid-template-columns: 1fr; }
      .inventory-controls .filter-row { overflow-x: auto; }
      .lots-list { grid-template-columns: 1fr; }
    }

    @media (max-width: 560px) {
      .inventory-content { padding-top: 16px; }
      .inventory-matrix, .lots-panel { padding: 15px; }
      .lots-heading { align-items: center; }
      .lots-heading p { display: none; }
    }

    .add-link {
      display: grid;
      place-items: center;
      text-decoration: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryComponent {
  private readonly inventoryApi = inject(InventoryApiService);
  protected readonly grades: GradeFilter[] = ['All', 'A', 'B', 'C'];
  protected readonly selectedGrade = signal<GradeFilter>('All');
  protected readonly query = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  private readonly lots = signal<InventoryLot[]>([]);
  protected readonly matrixGrades: Array<InventoryLot['grade']> = ['A', 'B', 'C'];
  protected readonly matrixSizes: Array<{ value: InventoryLot['size']; label: string }> = [
    { value: 'EXTRA_SMALL', label: 'Extra-Small' },
    { value: 'SMALL', label: 'Small' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LARGE', label: 'Large' },
    { value: 'JUMBO', label: 'Jumbo' },
  ];

  constructor() {
    this.inventoryApi.list().subscribe({
      next: ({ data }) => {
        this.lots.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Inventory could not be loaded. Check the API and database connection.');
        this.loading.set(false);
      },
    });
  }

  protected readonly filteredLots = computed(() => {
    const grade = this.selectedGrade();
    const query = this.query().trim().toLowerCase();
    return this.lots().filter((lot) => {
      const gradeMatches = grade === 'All' || lot.grade === grade;
      const textMatches =
        !query ||
        `${lot.batchNumber} ${lot.size} ${lot.grade}`.toLowerCase().includes(query);
      return gradeMatches && textMatches;
    });
  });

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected formatSize(size: InventoryLot['size']): string {
    return size.replace('_', '-').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  protected formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
  }

  protected quantity(size: InventoryLot['size'], grade: InventoryLot['grade']): number {
    return this.lots()
      .filter((lot) => lot.size === size && lot.grade === grade)
      .reduce((total, lot) => total + lot.availablePieces, 0);
  }

  protected sizeTotal(size: InventoryLot['size']): number {
    return this.matrixGrades.reduce((total, grade) => total + this.quantity(size, grade), 0);
  }

  protected gradeTotal(grade: InventoryLot['grade']): number {
    return this.matrixSizes.reduce((total, size) => total + this.quantity(size.value, grade), 0);
  }

  protected totalPieces(): number {
    return this.lots().reduce((total, lot) => total + lot.availablePieces, 0);
  }
}
