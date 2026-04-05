import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestCaseComponent } from './test-case';

describe('TestCaseComponent', () => {
  let component: TestCaseComponent;
  let fixture: ComponentFixture<TestCaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestCaseComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestCaseComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
