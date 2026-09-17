import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { SaveState, SaveStateIndicator } from '../save-state-indicator/save-state-indicator';

@Component({
  selector: 'app-form-pane-template',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, SaveStateIndicator],
  templateUrl: './form-pane-template.html',
  styleUrl: './form-pane-template.scss',
})
export class FormPaneTemplate {
  @Input({ required: true }) title: string = 'Form Pane';
  @Input({ required: true }) isEditMode: boolean = false;
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) isSaving: boolean = false;
  // Auto-save mode (notes, pattern add/edit): hides the Save/Add buttons,
  // shows the save status bottom-left, and renames Cancel to Close since
  // closing now persists via flush instead of discarding.
  @Input() autoSaveMode: boolean = false;
  @Input() saveState: SaveState = 'idle';
  @Input() savedAt: Date | null = null;

  @Output() cancelForm = new EventEmitter<any>();
  @Output() saveForm = new EventEmitter<any>();
  @Output() addForm = new EventEmitter<any>();
  @Output() retrySave = new EventEmitter<void>();
}
