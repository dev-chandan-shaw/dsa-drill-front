import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ImageUploadService } from './image-upload.service';

describe('ImageUploadService', () => {
  let service: ImageUploadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ImageUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts multipart form with file and section', () => {
    const file = new File(['bytes'], 'note.png', { type: 'image/png' });
    service.upload(file, 'notes').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/uploads/images`);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('section')).toBe('notes');
    expect((body.get('file') as File).name).toBe('note.png');
    req.flush({ url: 'https://res.cloudinary.com/demo/a.png', publicId: 'a' });
  });

  it('defaults section to notes', () => {
    const file = new File(['bytes'], 'a.png', { type: 'image/png' });
    service.upload(file).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/uploads/images`);
    expect((req.request.body as FormData).get('section')).toBe('notes');
    req.flush({ url: 'https://example.com/a.png', publicId: 'a' });
  });
});
