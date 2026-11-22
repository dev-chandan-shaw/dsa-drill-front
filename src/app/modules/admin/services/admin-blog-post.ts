import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  IBlogPost,
  IBlogPostDto,
  IBlogPostSummary,
} from '../../../shared/models/blog-post';

@Injectable({
  providedIn: 'root',
})
export class AdminBlogPostService {
  private readonly api = environment.apiUrl + '/admin';
  private readonly http = inject(HttpClient);

  getAll(): Observable<IBlogPostSummary[]> {
    return this.http.get<IBlogPostSummary[]>(`${this.api}/blog-posts`);
  }

  getOne(id: number): Observable<IBlogPost> {
    return this.http.get<IBlogPost>(`${this.api}/blog-posts/${id}`);
  }

  save(payload: IBlogPostDto): Observable<IBlogPost> {
    return this.http.post<IBlogPost>(`${this.api}/blog-posts`, payload);
  }

  publish(id: number): Observable<IBlogPost> {
    return this.http.post<IBlogPost>(`${this.api}/blog-posts/${id}/publish`, {});
  }

  unpublish(id: number): Observable<IBlogPost> {
    return this.http.post<IBlogPost>(`${this.api}/blog-posts/${id}/unpublish`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/blog-posts/${id}`);
  }
}
