import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { MatButtonToggleGroup } from '@angular/material/button-toggle';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { ProblemSheetService } from '../../shared/services/public-api/problem-sheet.service';
import { SavedProblemSheetService } from '../../shared/services/public-api/saved-problem-sheet.service';
import { LibrarySheets } from './library-sheets';
import { RightPaneService } from '../../shared/services/right-pane-service';
import { environment } from '../../../environments/environment';

describe('Sheet list actions', () => {
  let fixture: ComponentFixture<LibrarySheets>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LibrarySheets], providers: [
      provideRouter([]),
      provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { isLoggedIn: () => signal(true) } },
      { provide: SavedProblemSheetService, useValue: {
        problemSheets: signal([]), hasLoaded: signal(true), fetchProblemSheets: () => Promise.resolve(),
      } },
    ] });
    const sheets = TestBed.inject(ProblemSheetService);
    sheets.problemSheets.set([{ id: 'mine', title: 'Interview practice' }]);
    sheets.hasLoaded.set(true);
    vi.spyOn(sheets, 'fetchProblemSheets').mockResolvedValue();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LibrarySheets);
    fixture.detectChanges();
  });
  afterEach(() => { http.verify(); fixture.destroy(); });

  it('hides the selected toggle checkmark', () => {
    const group = fixture.debugElement.query(By.directive(MatButtonToggleGroup)).injector.get(MatButtonToggleGroup);
    expect(group.hideSingleSelectionIndicator).toBe(true);
  });

  it('opens the picker in place, loads authenticated sheet details, and saves selected questions', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.nativeElement.querySelector('[aria-label="Add questions to Interview practice"]').click();
    expect(navigate).not.toHaveBeenCalled();
    const pane = TestBed.inject(RightPaneService);
    expect(pane.isOpen).toBe(true);
    const sheet = { id: 'mine', title: 'Interview practice', problemIds: [1], isOwner: true, isPublic: false };
    http.expectOne(`${environment.apiUrl}/problem-sheets/mine`).flush(sheet);
    expect(fixture.componentInstance.questionForm.controls.problemIds.value).toEqual([1]);
    fixture.componentInstance.questionForm.controls.problemIds.setValue([1, 2]);
    fixture.componentInstance.saveQuestions();
    const update = http.expectOne(`${environment.apiUrl}/problem-sheets`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.problemIds).toEqual([1, 2]);
    expect(update.request.body.isPublic).toBe(false);
    update.flush({ ...sheet, problemIds: [1, 2] });
    expect(pane.isOpen).toBe(false);
  });

  it('keeps the selection available when saving fails', () => {
    fixture.componentInstance.openQuestionPicker({ id: 'mine', title: 'Interview practice' });
    http.expectOne(`${environment.apiUrl}/problem-sheets/mine`).flush({ id: 'mine', title: 'Interview practice', problemIds: [1], isOwner: true, isPublic: false });
    fixture.componentInstance.questionForm.controls.problemIds.setValue([1, 2]);
    fixture.componentInstance.saveQuestions();
    http.expectOne(`${environment.apiUrl}/problem-sheets`).flush({}, { status: 500, statusText: 'Error' });
    expect(TestBed.inject(RightPaneService).isOpen).toBe(true);
    expect(fixture.componentInstance.questionForm.controls.problemIds.value).toEqual([1, 2]);
    expect(fixture.componentInstance.savingQuestions()).toBe(false);
  });
});
