import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('renders the primary navigation', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const navigation = fixture.nativeElement.querySelector(
      'nav[aria-label="Primary navigation"]',
    );
    expect(navigation).toBeTruthy();
    expect(navigation.querySelectorAll('a')).toHaveLength(5);
  });
});
