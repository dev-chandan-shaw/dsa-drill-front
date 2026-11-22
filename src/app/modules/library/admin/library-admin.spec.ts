import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LibraryAdmin } from './library-admin';
import { LibraryApi } from '../library-api.service';
import { SeoService } from '../../../shared/services/seo.service';

describe('Library publishing add menu', () => {
  it('shows one add button and reveals draft destinations only in its menu', async () => {
    await TestBed.configureTestingModule({
      imports: [LibraryAdmin],
      providers: [
        provideRouter([]),
        { provide: LibraryApi, useValue: { adminArticles: () => of([]) } },
        { provide: SeoService, useValue: { setPageMeta: () => {} } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(LibraryAdmin);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelectorAll('.content-filters .add-content').length).toBe(1);
    expect(host.querySelectorAll('a[mat-menu-item]').length).toBe(0);
    expect(host.querySelector('.writing-destinations')).toBeNull();

    (host.querySelector('.add-content') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    const options = document.querySelectorAll('.cdk-overlay-container a[mat-menu-item]');
    expect(options.length).toBe(5);
    expect(Array.from(options, (option) => option.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('DSA pattern'),
        expect.stringContaining('LLD concept'),
        expect.stringContaining('LLD case study'),
        expect.stringContaining('HLD concept'),
        expect.stringContaining('HLD case study'),
      ]),
    );
    fixture.destroy();
  });
});
