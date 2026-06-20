import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SuggestionPayload {
  location?: string;
  latitude?: number;
  longitude?: number;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  dietPreference: 'veg' | 'non-veg';
  vegetables: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SuggestSubjiService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'https://akoe620g55.execute-api.us-east-1.amazonaws.com/api/suggest';

  suggestSubji(payload: SuggestionPayload): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }
}
