import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChipsInput } from './chips-input';

describe('ChipsInput', () => {
  let component: ChipsInput;
  let fixture: ComponentFixture<ChipsInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipsInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChipsInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
