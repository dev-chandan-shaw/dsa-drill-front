import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ProblemList } from './problem-list';

describe('ProblemList', () => {
  let component: ProblemList;
  let fixture: ComponentFixture<ProblemList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProblemList, NoopAnimationsModule],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProblemList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('problems', []);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
