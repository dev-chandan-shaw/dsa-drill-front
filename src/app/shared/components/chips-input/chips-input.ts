import { Component, forwardRef, Input } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { Chip, ChipModule } from 'primeng/chip';
import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'app-chips-input',
  standalone: true,
  imports: [Chip, ReactiveFormsModule, ChipModule, InputText],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => ChipsInput),
    },
  ],
  templateUrl: './chips-input.html',
  styleUrl: './chips-input.scss',
})
export class ChipsInput implements ControlValueAccessor {
  @Input() existingList: string[] = [];

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  private disabled = false;

  chips: string[] = [];

  error: string | null = null;

  writeValue(value: string[]): void {
    this.chips = value || [];
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
  addChip(event: any) {
    const input = event.target;
    let value = input.value;

    value = value.trim();

    if (!value) {
      return;
    }

    if (this.chips.includes(value)) {
      this.error = `SKU code [${value}] already added.`;
      return;
    }

    if (this.existingList.includes(value)) {
      this.error = `SKU code [${value}] already exists.`;
      return;
    }

    this.chips = [...this.chips, value];
    input.value = '';
    this.onChange(this.chips);
  }

  removeChip(index: number) {
    this.chips = this.chips.filter((_, i) => i !== index);

    this.error = null;

    this.onChange([...this.chips]); // always emit
    this.onTouched(); // always touch
  }

  touch() {
    this.onTouched();
  }
}
