import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { environment } from '../../../../../environments/environment';
import {
  ImageInsertDialog,
  ImageInsertDialogData,
} from './image-insert-dialog';

describe('ImageInsertDialog', () => {
  let component: ImageInsertDialog;
  let fixture: ComponentFixture<ImageInsertDialog>;
  let dialogClose: ReturnType<typeof vi.fn>;
  let httpMock: HttpTestingController;

  const baseData: ImageInsertDialogData = {
    target: 'link',
    section: 'notes',
    selectedText: 'docs',
  };

  async function setup(data: ImageInsertDialogData) {
    dialogClose = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ImageInsertDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: dialogClose } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageInsertDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock?.verify();
  });

  it('should create with link tab for link target', async () => {
    await setup(baseData);
    expect(component).toBeTruthy();
    expect(component.tab()).toBe('link');
    expect(component.linkText()).toBe('docs');
  });

  it('rejects invalid link URLs', async () => {
    await setup(baseData);
    component.linkUrl.set('not-a-url');
    component.insert();

    expect(dialogClose).not.toHaveBeenCalled();
    expect(component.uploadError()).toContain('valid');
  });

  it('closes with link result for valid URL', async () => {
    await setup(baseData);
    component.linkUrl.set('https://example.com/guide');

    component.insert();

    expect(dialogClose).toHaveBeenCalledWith([
      { target: 'link', text: 'docs', url: 'https://example.com/guide' },
    ]);
  });

  it('uploads pre-loaded files and inserts them', async () => {
    const file = new File(['bytes'], 'shot.png', { type: 'image/png' });
    await setup({ ...baseData, target: 'image', files: [file] });

    const req = httpMock.expectOne(`${environment.apiUrl}/uploads/images`);
    expect(req.request.method).toBe('POST');
    req.flush({ url: 'https://res.cloudinary.com/demo/shot.png', publicId: 'shot' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.uploads()).toEqual([
      { target: 'image', text: 'shot', url: 'https://res.cloudinary.com/demo/shot.png' },
    ]);
    expect(component.canInsert).toBe(true);

    component.insert();
    expect(dialogClose).toHaveBeenCalledWith(component.uploads());
  });
});
