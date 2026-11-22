import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

import { CustomProblemSheet } from './custom-problem-sheet';
import { RightPaneService } from '../../shared/services/right-pane-service';

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
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the summary card add action and preserves existing selections', () => {
    component.loadError.set(false);
    component.problemSheet.set({ id: 'mine', title: 'My sheet', problemIds: [1, 2], isOwner: true, isPublic: false });
    component.isOwner.set(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('[aria-label="Add problems to this sheet"]') as HTMLButtonElement;
    expect(fixture.nativeElement.querySelector('[aria-label="Breadcrumb"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sheet-question-actions')).toBeNull();
    button.click();
    expect(TestBed.inject(RightPaneService).isOpen).toBe(true);
    expect(component.selectionForm.controls.problemIds.value).toEqual([1, 2]);
  });

  it('saves selected questions and retains them when the picker is reopened', () => {
    component.sheetId.set('mine');
    component.sheetName.set('My sheet');
    component.problemSheet.set({ id: 'mine', title: 'My sheet', problemIds: [1], isOwner: true, isPublic: false });
    component.isOwner.set(true);
    component.onProblemsSelected([1, 2]);
    const request = httpMock.expectOne(`${environment.apiUrl}/problem-sheets`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.problemIds).toEqual([1, 2]);
    request.flush({ id: 'mine', title: 'My sheet', problemIds: [1, 2], isOwner: true, isPublic: false });
    expect(component.problemSheet()?.problemIds).toEqual([1, 2]);
    component.openProblemSelector();
    expect(component.selectionForm.controls.problemIds.value).toEqual([1, 2]);
  });

  it('does not offer question editing for sheets owned by someone else', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sheet-question-actions')).toBeNull();
    component.openProblemSelector();
    expect(TestBed.inject(RightPaneService).isOpen).toBe(false);
  });

  it('automatically opens the picker when arriving from the My lists Add questions action', () => {
    component.loadError.set(false);
    Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'queryParamMap', {
      value: convertToParamMap({ addQuestions: 'true' }),
    });
    component.problemSheet.set({ id: 'mine', title: 'My sheet', problemIds: [1], isOwner: true, isPublic: false });
    component.isOwner.set(true);
    fixture.detectChanges();
    expect(TestBed.inject(RightPaneService).isOpen).toBe(true);
    expect(component.selectionForm.controls.problemIds.value).toEqual([1]);
  });
});
