import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ImageUploadResponse {
  url: string;
  publicId: string;
}

/** Uploads note/pattern images to Cloudinary via the backend. Auth handled by interceptors. */
@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/uploads/images`;

  upload(file: File, section = 'notes'): Observable<HttpEvent<ImageUploadResponse>> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('section', section);
    return this.http.post<ImageUploadResponse>(this.endpoint, form, {
      reportProgress: true,
      observe: 'events',
    });
  }
}
