import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from '../../../../environments/environment';
import { TagPicker } from './tag-picker';

describe('TagPicker', () => {
  let component: TagPicker;
  let fixture: ComponentFixture<TagPicker>;
  let httpMock: HttpTestingController;

  const tags = [
    { id: 1, name: 'Arrays', slug: 'arrays' },
    { id: 2, name: 'Strings', slug: 'strings' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagPicker, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TagPicker);
    component = fixture.componentInstance;
    fixture.componentRef.setInput(
      'selectedControl',
      new FormControl<number[]>([1], { nonNullable: true }),
    );
    fixture.detectChanges();
    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(`${environment.apiUrl}/public/problem-tags`).flush(tags);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create with preselected ids synced', () => {
    expect(component).toBeTruthy();
    expect(component.isSelected(1)).toBe(true);
    expect(component.isSelected(2)).toBe(false);
  });

  it('filters tags by search', () => {
    component.setSearchTerm('str');
    expect(component.filteredTags().map((tag) => tag.name)).toEqual(['Strings']);
  });

  it('writes toggles back into the control', () => {
    component.toggleTagSelection(2);
    expect(component.selectedControl().value).toEqual([1, 2]);
    component.toggleTagSelection(1);
    expect(component.selectedControl().value).toEqual([2]);
  });
});
