import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';
import { RightPaneService } from '../../../shared/services/right-pane-service';
import { PatternEditor } from './pattern-editor';

describe('PatternEditor', () => {
  let component: PatternEditor;
  let fixture: ComponentFixture<PatternEditor>;
  let httpMock: HttpTestingController;
  let rightPane: RightPaneService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatternEditor, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: {}, paramMap: of(convertToParamMap({})) },
        },
        { provide: ConfirmDialogService, useValue: { confirm: () => of(false) } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatternEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock = TestBed.inject(HttpTestingController);
    rightPane = TestBed.inject(RightPaneService);
  });

  function flushInitialLoads(): void {
    httpMock
      .match(`${environment.apiUrl}/public/problems`)
      .forEach((req) => req.flush([]));
    httpMock
      .match(`${environment.apiUrl}/public/problem-tags`)
      .forEach((req) => req.flush([]));
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should create in add mode with an invalid form', () => {
    expect(component).toBeTruthy();
    expect(component.editingPatternId()).toBeNull();
    expect(component.patternForm.invalid).toBe(true);
    flushInitialLoads();
  });

  it('does not post when the form is invalid', () => {
    component.save();
    expect(component.patternForm.invalid).toBe(true);
    flushInitialLoads();
    httpMock.expectNone(`${environment.apiUrl}/admin/problem-patterns`);
  });

  it('opens the picker panes and closes them', () => {
    flushInitialLoads();
    component.openQuestionsPane();
    expect(rightPane.isOpen).toBe(true);
    expect(rightPane.template).toBeTruthy();
    component.closePane();
    expect(rightPane.isOpen).toBe(false);

    component.openTagsPane();
    expect(rightPane.isOpen).toBe(true);
    component.closePane();
    expect(rightPane.isOpen).toBe(false);
  });

  it('removes tags and problems from the form', () => {
    flushInitialLoads();
    component.patternForm.controls.tagIds.setValue([1, 2]);
    component.patternForm.controls.problemIds.setValue([11]);

    component.removeTag(1);
    component.removeProblem(11);

    expect(component.patternForm.controls.tagIds.value).toEqual([2]);
    expect(component.patternForm.controls.problemIds.value).toEqual([]);
  });
});
