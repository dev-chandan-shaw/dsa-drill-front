import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

import { CustomProblemSheet } from './custom-problem-sheet';

describe('CustomProblemSheet', () => {
  let component: CustomProblemSheet;
  let fixture: ComponentFixture<CustomProblemSheet>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomProblemSheet, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}) },
            paramMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CustomProblemSheet);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // ngOnInit fires real service calls: satisfy them with empty payloads.
    httpMock.expectOne(`${environment.apiUrl}/public/problem-tags`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/public/problems`).flush([]);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
