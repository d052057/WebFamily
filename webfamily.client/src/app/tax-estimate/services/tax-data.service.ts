import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TaxEstimateModel } from '../../models/tax-estimate.model';

@Injectable({
  providedIn: 'root'
})
export class TaxDataService {
  private http = inject(HttpClient);

  loadTaxData(): Observable<TaxEstimateModel> {
    return this.http.get<TaxEstimateModel>('assets/tax-data.json');
  }
}
