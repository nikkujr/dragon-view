import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlantingApiService, type PlantingGroup } from '../../core/planting-api.service';

@Component({
  selector:'dv-planting',imports:[RouterLink],
  template:`
  <section class="screen"><header class="hero"><div class="hero-top"><span></span><div><div class="brand">DRAGON-VIEW</div><h1>Plant Monitoring</h1></div><button class="icon-button" (click)="formOpen.set(true)">+</button></div>
    <div class="hero-pills"><span class="pill">{{groups().length}} active groups</span><span class="pill">{{readyCount()}} ready</span></div>
  </header><div class="content">
    <div class="metric-grid">
      <article class="card metric-card"><div class="metric-value">{{count('NEWLY_GRAFTED')}}</div><div class="metric-label">Newly Grafted</div></article>
      <article class="card metric-card"><div class="metric-value">{{count('INTERMEDIATE')}}</div><div class="metric-label">Intermediate</div></article>
      <article class="card metric-card"><div class="metric-value">{{count('NEAR_MATURITY')}}</div><div class="metric-label">Near Maturity</div></article>
      <article class="card metric-card"><div class="metric-value">{{readyCount()}}</div><div class="metric-label">Ready for Harvest</div></article>
    </div>
    <div class="toolbar"><input class="search" placeholder="Search record, variety, or location" (input)="search.set(value($event))"><select (change)="stage.set(value($event))"><option value="ALL">All stages</option><option value="NEWLY_GRAFTED">Newly Grafted</option><option value="INTERMEDIATE">Intermediate</option><option value="NEAR_MATURITY">Near Maturity</option></select></div>
    <div class="section-heading"><h2>Planting Groups</h2><span>45-day lifecycle</span></div>
    <div class="record-list">@for(group of filtered();track group.id){<a class="card plant-record" [routerLink]="['/planting',group.id]">
      <div class="row"><span class="record-icon">⚘</span><div class="plant-title"><strong>#{{group.recordNumber}}</strong><small>{{group.location}} · {{group.variety}} · {{group.numberOfPlants}} plants</small></div><span class="badge">{{label(group)}}</span></div>
      <div class="progress"><span [style.width.%]="group.progressPercent"></span></div><div class="dates"><span>{{group.elapsedDays}} days elapsed</span><span>{{group.readyForHarvest?'Ready now':group.remainingDays+' days remaining'}}</span><span>Maturity: {{group.estimatedMaturityDate}}</span></div>
    </a>}@empty{<article class="card empty">No planting groups found.</article>}</div>
  </div>
  @if(formOpen()){<div class="modal" (click)="formOpen.set(false)"><form class="card form" (submit)="create($event)" (click)="$event.stopPropagation()"><div class="section-heading"><h2>Record Planting Group</h2><button type="button" (click)="formOpen.set(false)">×</button></div>
    <input name="recordNumber" required placeholder="Record number"><input name="graftingDate" type="date" required [max]="today"><input name="variety" required placeholder="Variety"><input name="location" required placeholder="Location"><input name="numberOfPlants" type="number" min="1" required placeholder="Number of plants"><button class="primary">Save group</button>@if(message()){<p>{{message()}}</p>}</form></div>}
  </section>`,
  styles:`.toolbar{display:grid;grid-template-columns:1fr auto;gap:10px;margin:22px 0}.toolbar select{padding:0 14px;border:1px solid var(--line);border-radius:12px}.plant-record{padding:18px;color:inherit;text-decoration:none}.plant-title{flex:1}.plant-title strong,.plant-title small{display:block}.plant-title small,.dates{color:var(--muted)}.progress{height:7px;margin:15px 0 10px;border-radius:9px;background:var(--line);overflow:hidden}.progress span{display:block;height:100%;background:var(--magenta)}.dates{display:flex;justify-content:space-between;gap:8px;font-size:11px}.modal{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:20px;background:#0008}.form{display:grid;gap:10px;width:min(100%,520px);padding:22px}.form input{padding:12px;border:1px solid var(--line);border-radius:10px}.form button{border:0;background:transparent;font-size:22px}.form .primary{padding:12px;color:white;background:var(--magenta);font-size:14px}.empty{padding:25px}@media(max-width:600px){.toolbar{grid-template-columns:1fr}.dates{display:grid}}`,
  changeDetection:ChangeDetectionStrategy.OnPush
})
export class PlantingComponent{
 private readonly api=inject(PlantingApiService);protected readonly groups=signal<PlantingGroup[]>([]);protected readonly formOpen=signal(false);protected readonly search=signal('');protected readonly stage=signal('ALL');protected readonly message=signal('');protected readonly today=new Date().toISOString().slice(0,10);
 constructor(){this.load()} protected value(e:Event){return(e.target as HTMLInputElement).value} protected count(stage:string){return this.groups().filter(g=>g.stage===stage).length} protected readyCount(){return this.groups().filter(g=>g.readyForHarvest).length}
 protected label(g:PlantingGroup){return g.readyForHarvest?'Ready for Harvest':g.stage.replaceAll('_',' ')}
 protected filtered(){const q=this.search().toLowerCase();return this.groups().filter(g=>(this.stage()==='ALL'||g.stage===this.stage())&&(!q||`${g.recordNumber} ${g.variety} ${g.location}`.toLowerCase().includes(q)))}
 protected create(e:SubmitEvent){e.preventDefault();const f=e.currentTarget as HTMLFormElement;if(!f.reportValidity())return;const d=new FormData(f);this.api.create({recordNumber:d.get('recordNumber'),graftingDate:d.get('graftingDate'),variety:d.get('variety'),location:d.get('location'),numberOfPlants:Number(d.get('numberOfPlants'))}).subscribe({next:()=>{this.formOpen.set(false);f.reset();this.load()},error:(x:any)=>this.message.set(x.error?.error?.message??'Unable to save group.')})}
 private load(){this.api.list().subscribe({next:({data})=>this.groups.set(data),error:()=>this.message.set('Planting groups could not be loaded.')})}
}
