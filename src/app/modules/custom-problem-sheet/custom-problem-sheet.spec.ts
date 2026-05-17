import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomProblemSheet } from './custom-problem-sheet';

describe('CustomProblemSheet', () => {
  let component: CustomProblemSheet;
  let fixture: ComponentFixture<CustomProblemSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomProblemSheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomProblemSheet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
