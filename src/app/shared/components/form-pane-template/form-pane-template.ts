import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-form-pane-template',
  imports: [ButtonModule, DividerModule],
  templateUrl: './form-pane-template.html',
  styleUrl: './form-pane-template.scss',
})
export class FormPaneTemplate {
  @Input({ required: true }) title: string = 'Form Pane';
  @Input({ required: true }) isEditMode: boolean = false;
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) isSaving: boolean = false;

  @Output() cancelForm = new EventEmitter<any>();
  @Output() saveForm = new EventEmitter<any>();
  @Output() addForm = new EventEmitter<any>();
}
