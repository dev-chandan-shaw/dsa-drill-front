import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';
import { ImageUploadService } from '../../../services/image-upload.service';

export interface ImageInsertDialogData {
  /** Whether the user clicked the link or the image button. */
  target: 'link' | 'image';
  /** Cloudinary subfolder: 'notes' for problem notes, 'patterns' for admin patterns. */
  section: string;
  /** Currently selected text in the editor, used to prefill the label. */
  selectedText: string;
  /** Files dropped or pasted into the editor; upload starts immediately. */
  files?: File[];
}

export interface ImageInsertResult {
  target: 'link' | 'image';
  text: string;
  url: string;
}

type InsertTab = 'upload' | 'link';

/**
 * Floating insert dialog for the markdown editor. Upload tab streams images
 * to Cloudinary (browse, drop, or pre-loaded paste/drop files); Link tab
 * takes a label + URL. Closes with the inserts for the editor to place.
 */
@Component({
  selector: 'app-image-insert-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './image-insert-dialog.html',
  styleUrl: './image-insert-dialog.scss',
})
export class ImageInsertDialog {
  readonly data = inject<ImageInsertDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ImageInsertDialog>);
  private readonly imageUploadService = inject(ImageUploadService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly tab = signal<InsertTab>(this.data.target === 'image' ? 'upload' : 'link');
  readonly linkText = signal(this.data.selectedText || '');
  readonly linkUrl = signal('');
  readonly uploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly uploadError = signal('');
  readonly uploads = signal<ImageInsertResult[]>([]);

  constructor() {
    if (this.data.files?.length) {
      this.tab.set('upload');
      queueMicrotask(() => this.uploadFiles(this.data.files!));
    }
  }

  setTab(tab: InsertTab) {
    this.tab.set(tab);
    this.uploadError.set('');
  }

  onFilePicked(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files?.length) {
      this.uploadFiles([...files]);
      (event.target as HTMLInputElement).value = '';
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files.length) {
      this.uploadFiles([...event.dataTransfer.files]);
    }
  }

  updateAlt(index: number, value: string) {
    this.uploads.update((current) =>
      current.map((item, i) => (i === index ? { ...item, text: value } : item)),
    );
  }

  get canInsert(): boolean {
    if (this.tab() === 'link') {
      return /^https?:\/\/.+/i.test(this.linkUrl().trim());
    }
    return !this.uploading() && this.uploads().length > 0;
  }

  insert() {
    if (this.tab() === 'link') {
      const url = this.linkUrl().trim();
      if (!/^https?:\/\/.+/i.test(url)) {
        this.uploadError.set('Enter a valid http(s) URL.');
        return;
      }
      const text = this.linkText().trim() || 'text';
      this.dialogRef.close([{ target: 'link', text, url } satisfies ImageInsertResult]);
      return;
    }
    if (this.uploads().length) {
      this.dialogRef.close(this.uploads());
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  private uploadFiles(files: File[]) {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
      this.uploadError.set('Only PNG, JPEG, WebP or GIF images can be uploaded.');
      return;
    }
    this.tab.set('upload');
    this.uploadError.set('');
    const queue = [...images];
    const next = (): void => {
      const file = queue.shift();
      if (!file) return;
      this.uploading.set(true);
      this.uploadProgress.set(0);
      this.imageUploadService
        .upload(file, this.data.section)
        .pipe(finalize(() => this.uploading.set(false)))
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              const total = event.total ?? file.size;
              this.uploadProgress.set(total ? Math.round((100 * event.loaded) / total) : 0);
            } else if (event.type === HttpEventType.Response) {
              const url = event.body?.url;
              if (url) {
                this.uploads.update((current) => [
                  ...current,
                  { target: 'image', text: this.altFromFileName(file.name), url },
                ]);
              } else {
                this.uploadError.set('Upload returned no URL, please retry.');
              }
              next();
            }
          },
          error: () => {
            this.uploadError.set('Image upload failed, please retry.');
            next();
          },
        });
    };
    next();
  }

  private altFromFileName(name: string): string {
    return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'image';
  }
}
