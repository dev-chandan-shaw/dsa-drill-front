import { CommonModule } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ImageUploadService } from '../../services/image-upload.service';

/**
 * Small cover-image field: uploads to Cloudinary through the shared backend
 * endpoint and writes the returned URL into the bound form control.
 */
@Component({
  selector: 'app-cover-uploader',
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule],
  templateUrl: './cover-uploader.html',
  styleUrl: './cover-uploader.scss',
})
export class CoverUploader {
  control = input.required<FormControl<string | null>>();
  folder = input('blogs');
  label = input('Cover image');
  readonly uploadingChange = output<boolean>();

  private readonly imageUploadService = inject(ImageUploadService);

  readonly uploading = signal(false);
  readonly error = signal('');

  onFilePicked(event: Event): void {
    if (this.control().disabled || this.uploading()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.error.set('Choose a PNG, JPEG, WebP or GIF image.');
      return;
    }
    this.error.set('');
    this.uploading.set(true);
    this.uploadingChange.emit(true);
    this.imageUploadService
      .upload(file, this.folder())
      .pipe(finalize(() => {
        this.uploading.set(false);
        this.uploadingChange.emit(false);
      }))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.Response) {
            const url = event.body?.url;
            if (url) {
              this.control().setValue(url);
              this.control().markAsDirty();
            } else {
              this.error.set('Upload returned no URL, please retry.');
            }
          }
        },
        error: () => this.error.set('Image upload failed, please retry.'),
      });
  }

  remove(): void {
    if (this.control().disabled || this.uploading()) return;
    this.control().setValue(null);
    this.control().markAsDirty();
  }
}
