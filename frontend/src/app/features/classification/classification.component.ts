import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'dv-classification',
  template: `
    <section class="screen classification-screen">
      <header class="hero">
        <div class="hero-top">
          <button class="icon-button" type="button" aria-label="Open menu">☰</button>
          <div><div class="brand">DRAGON-VIEW</div><h1>Quality Scan</h1></div>
          <button class="icon-button" type="button" aria-label="History">↺</button>
        </div>
      </header>
      <div class="content">
        <section class="camera-frame card" aria-label="Camera preview">
          <div class="fruit-target">✦</div>
          <p>Position one dragon fruit inside the guide.</p>
          <small>The AI model integration is deferred; this screen is ready for the model artifact.</small>
        </section>
        <div class="scan-actions">
          <button type="button">Upload image</button>
          <button class="capture" type="button" aria-label="Capture image">●</button>
          <button type="button">Retake</button>
        </div>
        <section class="card result-card">
          <span class="record-icon">A</span>
          <div><strong>Awaiting classification</strong><small>Grade and confidence will appear here.</small></div>
        </section>
      </div>
    </section>
  `,
  styles: `
    .camera-frame {
      min-height: 360px;
      display: grid;
      place-content: center;
      justify-items: center;
      padding: 24px;
      text-align: center;
      background: linear-gradient(145deg, #2b2730, #151418);
      color: #fff;
    }
    .camera-frame small { max-width: 280px; opacity: 0.65; }
    .fruit-target {
      width: 190px;
      height: 190px;
      display: grid;
      place-items: center;
      border: 3px dashed rgb(255 255 255 / 65%);
      border-radius: 50%;
      color: #f67aa6;
      font-size: 4rem;
    }
    .scan-actions {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 14px;
      margin: 18px 0;
    }
    .scan-actions button {
      border: 0;
      color: var(--magenta);
      background: transparent;
      font-weight: 700;
    }
    .scan-actions .capture {
      width: 68px;
      height: 68px;
      border: 8px solid var(--magenta-soft);
      border-radius: 50%;
      color: #fff;
      background: var(--magenta);
      font-size: 1.5rem;
    }
    .result-card {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 12px;
      align-items: center;
      padding: 14px;
    }
    .result-card small { display: block; color: var(--muted); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassificationComponent {}
