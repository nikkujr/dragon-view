import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SalesApiService, type SaleDetails } from '../../core/sales-api.service';

@Component({
  selector: 'dv-sale-details',
  imports: [CurrencyPipe, RouterLink],
  template: `
    <section class="screen"><header class="hero compact"><div class="hero-top"><a routerLink="/sales" class="back">‹</a><div><div class="brand">DRAGON-VIEW</div><h1>Sale Details</h1></div><span></span></div></header>
      <div class="content">@if (sale(); as item) {
        <article class="card panel"><div class="section-heading"><h2>Sale #{{ item.id }}</h2><span class="badge">{{ item.status }}</span></div>
          <p><strong>{{ item.customer.name }}</strong><br>{{ item.customer.address }}<br>{{ item.customer.contactNumber }} · {{ item.customer.emailAddress }}</p>
          <div class="total">{{ item.totalAmount | currency:'PHP':'symbol-narrow' }}</div>
        </article>
        @if (item.status === 'DRAFT' && isOwner()) {
          <article class="card panel"><h2>Edit Draft</h2><form (submit)="update($event)">
            <input name="name" [value]="item.customer.name" required><input name="address" [value]="item.customer.address" required>
            <input name="contact" [value]="item.customer.contactNumber" required><input name="email" type="email" [value]="item.customer.emailAddress" required>
            @for (line of item.items; track line.id) {
              <fieldset><select name="size" [value]="line.size"><option value="EXTRA_SMALL">Extra-Small</option><option>SMALL</option><option>MEDIUM</option><option>LARGE</option><option>JUMBO</option></select>
              <select name="grade" [value]="line.grade"><option>A</option><option>B</option><option>C</option></select>
              <input name="pieces" type="number" min="1" [value]="line.pieces" required><input name="weight" type="number" min=".001" step=".001" [value]="line.totalWeightKilograms" required></fieldset>
            }
            <button>Save Draft Changes</button></form>
          </article>
        }
        @if (item.status === 'DRAFT') {
          <article class="card panel"><h2>Complete Draft</h2>
            <p>Current prices and available FIFO inventory will be revalidated before completion.</p>
            <form (submit)="complete($event)">
              <select name="method" (change)="paymentMethod.set(selectValue($event))"><option value="CASH">Cash</option><option value="GCASH">GCash</option><option value="MAYA">Maya</option><option value="OTHER_E_WALLET">Other e-wallet</option><option value="BANK_TRANSFER">Bank transfer</option></select>
              <input name="amountPaid" type="number" min="0" step=".01" required placeholder="Amount paid">
              @if (paymentMethod() !== 'CASH') { <input name="reference" required placeholder="Payment reference"> }
              @if (paymentMethod() === 'OTHER_E_WALLET') { <input name="provider" required placeholder="E-wallet provider"> }
              <button>Confirm Payment and Complete</button>
            </form>
          </article>
        }
        <div class="section-heading heading"><h2>Items and FIFO Allocation</h2></div>
        @for (line of item.items; track line.id) { <article class="card panel"><strong>Grade {{ line.grade }} · {{ format(line.size) }}</strong><p>{{ line.pieces }} pieces · {{ line.totalWeightKilograms }} kg × {{ line.pricePerKilogram | currency:'PHP':'symbol-narrow' }} = {{ line.subtotal | currency:'PHP':'symbol-narrow' }}</p>
          @for (allocation of line.allocations; track allocation.inventoryId) { <small>#{{ allocation.batchNumber }}: {{ allocation.pieces }} pieces</small> }
        </article> }
        @if (message()) { <p class="message">{{ message() }}</p> }
      } @else { <article class="card panel">{{ message() || 'Loading…' }}</article> }</div>
    </section>
  `,
  styles: `
    .compact{padding-bottom:22px}.back{color:white;text-decoration:none;font-size:30px}.panel{padding:18px;margin-bottom:12px}.total{font-size:24px;font-weight:900;color:var(--magenta)}
    form{display:grid;grid-template-columns:1fr 1fr;gap:8px}fieldset{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;border:0;padding:0}input,select{min-width:0;padding:10px;border:1px solid var(--line);border-radius:9px}button{grid-column:1/-1;padding:12px;border:0;border-radius:10px;color:white;background:var(--magenta);font-weight:800}.heading{margin-top:18px}.message{color:var(--magenta)}small{display:block;color:var(--muted)}
    @media(max-width:520px){form,fieldset{grid-template-columns:1fr}}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleDetailsComponent {
  private readonly api = inject(SalesApiService); private readonly auth = inject(AuthService);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  protected readonly sale = signal<SaleDetails | null>(null); protected readonly message = signal('');
  protected readonly paymentMethod = signal('CASH');
  protected readonly isOwner = () => this.auth.user()?.role === 'OWNER_ADMIN';
  constructor(){this.load()} protected format(value:string){return value.replace('_','-')}
  protected selectValue(event:Event){return (event.target as HTMLSelectElement).value}
  protected update(event:SubmitEvent){event.preventDefault();const form=event.currentTarget as HTMLFormElement;if(!form.reportValidity())return;const d=new FormData(form),sizes=d.getAll('size'),grades=d.getAll('grade'),pieces=d.getAll('pieces'),weights=d.getAll('weight');
    this.api.updateDraft(this.id,{customer:{name:d.get('name'),address:d.get('address'),contactNumber:d.get('contact'),emailAddress:d.get('email')},items:sizes.map((size,i)=>({size,grade:grades[i],pieces:Number(pieces[i]),totalWeightKilograms:Number(weights[i]).toFixed(3)}))}).subscribe({next:()=>{this.message.set('Draft updated.');this.load()},error:(e:unknown)=>this.message.set(e instanceof HttpErrorResponse?e.error?.error?.message??'Update failed.':'Update failed.')})}
  protected complete(event:SubmitEvent){event.preventDefault();const form=event.currentTarget as HTMLFormElement;if(!form.reportValidity())return;const d=new FormData(form);
    this.api.completeDraft(this.id,{method:d.get('method'),amountPaid:Number(d.get('amountPaid')).toFixed(2),...(d.get('reference')?{reference:d.get('reference')}:{ }),...(d.get('provider')?{otherEWalletProvider:d.get('provider')}:{ })}).subscribe({next:({data})=>{this.message.set(`Draft completed. Total: ₱${data.totalAmount}`);this.load()},error:(e:unknown)=>this.message.set(e instanceof HttpErrorResponse?e.error?.error?.message??'Completion failed.':'Completion failed.')})}
  private load(){this.api.details(this.id).subscribe({next:({data})=>this.sale.set(data),error:()=>this.message.set('Sale could not be loaded.')})}
}
