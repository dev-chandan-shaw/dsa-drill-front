import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IBlogSection, IBlogSectionDto } from '../../../shared/models/blog-section';

@Injectable({
  providedIn: 'root',
})
export class AdminBlogSectionService {
  private readonly api = environment.apiUrl + '/admin';
  private readonly http = inject(HttpClient);

  getAll(): Observable<IBlogSection[]> {
    return this.http.get<IBlogSection[]>(`${this.api}/blog-sections`);
  }

  save(payload: IBlogSectionDto): Observable<IBlogSection> {
    return this.http.post<IBlogSection>(`${this.api}/blog-sections`, payload);
  }

  delete(sectionId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/blog-sections/${sectionId}`);
  }
}
