import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormPaneTemplate } from './form-pane-template';

describe('FormPaneTemplate', () => {
  let component: FormPaneTemplate;
  let fixture: ComponentFixture<FormPaneTemplate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormPaneTemplate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormPaneTemplate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
