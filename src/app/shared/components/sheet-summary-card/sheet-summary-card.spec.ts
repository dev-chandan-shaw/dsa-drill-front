import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SheetSummaryCard } from './sheet-summary-card';

describe('SheetSummaryCard', () => {
  let component: SheetSummaryCard;
  let fixture: ComponentFixture<SheetSummaryCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SheetSummaryCard, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SheetSummaryCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clamp the solved percent to 0-100', () => {
    fixture.componentRef.setInput('solvedPercent', 150);
    expect(component.clampedPercent()).toBe(100);

    fixture.componentRef.setInput('solvedPercent', -5);
    expect(component.clampedPercent()).toBe(0);
  });

  it('should render a full ring offset at 0% and none at 100%', () => {
    fixture.componentRef.setInput('solvedPercent', 0);
    expect(component.ringOffset()).toBeCloseTo(component.ringCircumference, 5);

    fixture.componentRef.setInput('solvedPercent', 100);
    expect(component.ringOffset()).toBeCloseTo(0, 5);
  });
});
