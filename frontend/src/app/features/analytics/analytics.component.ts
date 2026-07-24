import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SalesApiService, type SalesAnalytics } from '../../core/sales-api.service';

@Component({
  selector: 'dv-analytics',
  imports: [CurrencyPipe, DecimalPipe],
  template: `
    <section class="screen"><header class="hero"><div class="hero-top"><span></span><div><div class="brand">DRAGON-VIEW</div><h1>Sales Analytics</h1></div><span>Owner/Admin</span></div>
      <div class="controls"><select [value]="period()" (change)="changePeriod($event)"><option value="daily">Daily</option><option value="monthly">Monthly</option><option value="annual">Annual</option></select><input type="date" [value]="date()" (change)="changeDate($event)"></div>
    </header><div class="content">
      @if (report(); as data) {
        <div class="metric-grid">
          <article class="card metric-card"><div class="metric-value">{{ data.totals.revenue | currency:'PHP':'symbol-narrow' }}</div><div class="metric-label">Revenue</div><span class="trend" [class.down]="(data.comparisonPercent ?? 0) < 0">{{ comparison(data) }}</span></article>
          <article class="card metric-card"><div class="metric-value">{{ data.totals.completedSales }}</div><div class="metric-label">Completed sales</div></article>
          <article class="card metric-card"><div class="metric-value">{{ data.totals.pieces }}</div><div class="metric-label">Pieces sold</div></article>
          <article class="card metric-card"><div class="metric-value">{{ data.totals.weightKilograms | number:'1.3-3' }} kg</div><div class="metric-label">Total weight</div></article>
        </div>
        <section class="card chart-card"><div class="section-heading"><h2>Revenue trend</h2><span>PHP</span></div>
          <div class="bars">@for (point of data.trend; track point.label) { <div><span [style.height.%]="barHeight(point.revenue)"></span><small>{{ point.label }}</small><b>{{ point.revenue | currency:'PHP':'symbol-narrow':'1.0-0' }}</b></div> } @empty { <p>No completed sales in this period.</p> }</div>
        </section>
        <section class="card table-card"><div class="section-heading"><h2>Size and grade summary</h2><span>{{ period() }}</span></div>
          <table><thead><tr><th>Category</th><th>Pieces</th><th>Weight</th><th>Revenue</th></tr></thead><tbody>
            @for (row of data.summary; track row.size + row.grade) { <tr><td>{{ format(row.size) }} · Grade {{ row.grade }}</td><td>{{ row.pieces }}</td><td>{{ row.weightKilograms | number:'1.3-3' }} kg</td><td>{{ row.revenue | currency:'PHP':'symbol-narrow' }}</td></tr> }
          </tbody></table>
        </section>
      } @else { <article class="card state">{{ message() || 'Loading report…' }}</article> }
    </div></section>
  `,
  styles: `
    .controls{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.controls select,.controls input{padding:11px;border:0;border-radius:10px;font:inherit}.trend{display:block;margin-top:7px;color:var(--green);font-size:11px}.trend.down{color:var(--red)}
    .bars{height:220px;display:flex;gap:8px;align-items:end;overflow-x:auto;padding-top:18px}.bars>div{height:100%;min-width:42px;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:4px}.bars span{width:28px;min-height:2px;border-radius:7px 7px 2px 2px;background:linear-gradient(var(--magenta),#f07ca5)}.bars small,.bars b{font-size:9px}.bars b{color:var(--muted)}
    .table-card{margin-top:12px;padding:15px;overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:10px 5px;border-bottom:1px solid var(--line);text-align:right}th:first-child,td:first-child{text-align:left}.state{padding:22px}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent {
  private readonly api=inject(SalesApiService); protected readonly period=signal('daily');
  protected readonly date=signal(new Date().toISOString().slice(0,10)); protected readonly report=signal<SalesAnalytics|null>(null); protected readonly message=signal('');
  private readonly maxRevenue=computed(()=>Math.max(1,...(this.report()?.trend.map(point=>point.revenue)??[1])));
  constructor(){this.load()} protected changePeriod(e:Event){this.period.set((e.target as HTMLSelectElement).value);this.load()}
  protected changeDate(e:Event){this.date.set((e.target as HTMLInputElement).value);this.load()}
  protected barHeight(value:number){return Math.max(2,value/this.maxRevenue()*100)} protected format(value:string){return value.replace('_','-')}
  protected comparison(data:SalesAnalytics){return data.comparisonPercent===null?'No previous-period baseline':`${data.comparisonPercent>=0?'+':''}${data.comparisonPercent.toFixed(1)}% vs previous period`}
  private load(){this.report.set(null);this.api.analytics(this.period(),this.date()).subscribe({next:({data})=>this.report.set(data),error:()=>this.message.set('Analytics could not be loaded.')})}
}
