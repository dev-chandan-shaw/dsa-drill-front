import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';

import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let httpMock: HttpTestingController;
  let locationHref = '';

  beforeEach(async () => {
    locationHref = 'http://localhost/';
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {},
    });
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      get: () => locationHref,
      set: (value: string) => {
        locationHref = value;
      },
    });

    await TestBed.configureTestingModule({
      imports: [Register, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: StorageService,
          useValue: {
            get: () => null,
            set: () => undefined,
            remove: () => undefined,
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        {
          provide: Router,
          useValue: {
            url: '/register',
            navigateByUrl: () => Promise.resolve(true),
            navigate: () => Promise.resolve(true),
          },
        },
        {
          provide: MatSnackBar,
          useValue: { open: () => undefined },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect to Google for signup', () => {
    const button = fixture.nativeElement.querySelector('.google-btn') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();

    expect(locationHref).toBe(environment.googleOAuthRedirectUrl);
  });
});
