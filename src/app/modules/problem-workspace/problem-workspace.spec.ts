import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProblemWorkspace } from './problem-workspace';

describe('ProblemWorkspace', () => {
  let component: ProblemWorkspace;
  let fixture: ComponentFixture<ProblemWorkspace>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProblemWorkspace]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProblemWorkspace);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
