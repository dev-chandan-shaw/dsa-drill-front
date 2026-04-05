import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ICategory } from '../models/category';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly api = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getCategories() {
    return this.http.get<ICategory[]>(`${this.api}/problem-tags`);
  }
}
