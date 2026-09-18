import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SaveStateIndicator } from './save-state-indicator';

describe('SaveStateIndicator', () => {
  let component: SaveStateIndicator;
  let fixture: ComponentFixture<SaveStateIndicator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveStateIndicator, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SaveStateIndicator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render nothing while idle', () => {
    expect(fixture.nativeElement.querySelector('.save-state')).toBeNull();
  });

  it('should show unsaved changes when dirty', () => {
    fixture.componentRef.setInput('state', 'dirty');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unsaved changes');
  });

  it('should show saving state', () => {
    fixture.componentRef.setInput('state', 'saving');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Saving');
  });

  it('should show saved with time', () => {
    fixture.componentRef.setInput('state', 'saved');
    fixture.componentRef.setInput('savedAt', new Date(2026, 0, 1, 12, 30));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Saved');
  });

  it('should emit retry from the error state', () => {
    let retries = 0;
    component.retry.subscribe(() => retries++);
    fixture.componentRef.setInput('state', 'error');
    fixture.detectChanges();
    const retryBtn = fixture.nativeElement.querySelector('.save-state button') as HTMLElement;
    expect(fixture.nativeElement.textContent).toContain("Couldn't save");
    retryBtn.click();
    expect(retries).toBe(1);
  });
});
