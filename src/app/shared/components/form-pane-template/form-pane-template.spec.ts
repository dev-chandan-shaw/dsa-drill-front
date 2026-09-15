import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FormPaneTemplate } from './form-pane-template';

describe('FormPaneTemplate', () => {
  let component: FormPaneTemplate;
  let fixture: ComponentFixture<FormPaneTemplate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormPaneTemplate, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FormPaneTemplate);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', new FormGroup({}));
    fixture.componentRef.setInput('title', 'Test Pane');
    fixture.componentRef.setInput('isEditMode', false);
    fixture.componentRef.setInput('isSaving', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
