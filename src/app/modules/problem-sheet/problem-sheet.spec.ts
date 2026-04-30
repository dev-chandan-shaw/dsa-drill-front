import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProblemSheet } from './problem-sheet';

describe('ProblemSheet', () => {
  let component: ProblemSheet;
  let fixture: ComponentFixture<ProblemSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProblemSheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProblemSheet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
