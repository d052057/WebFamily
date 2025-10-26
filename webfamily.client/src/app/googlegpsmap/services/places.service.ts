// services/places.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserProfile, SavedPlace, ApiResponse, SavePlaceRequest, SearchResult } from '../interfaces/googlemapgps.interface';

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private readonly apiUrl = '/api'; // Adjust based on your .NET API URL
  private http = inject(HttpClient); // Using Angular's inject function for HttpClient)
  constructor() { }

  /**
   * Get user places from backend
   */
  getUserPlaces(userProf: UserProfile): Observable<UserProfile> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.apiUrl}/places/${userProf.id}/name/${userProf.name}/email/${userProf.email}/places`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Convert dateAdded strings back to Date objects
            response.data.savedPlaces = response.data.savedPlaces.map(place => ({
              ...place,
              dateAdded: new Date(place.dateAdded)
            }));
            return response.data;
          }
          throw new Error(response.message || 'Failed to load user places');
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Save a place to backend
   */
  savePlace(userProf: UserProfile, searchResult: SearchResult): Observable<SavedPlace> {
    const request: SavePlaceRequest = {
      name: searchResult.display_name.split(',')[0],
      address: searchResult.display_name,
      lat: parseFloat(searchResult.lat),
      lng: parseFloat(searchResult.lon),
      type: 'custom'
    };

    return this.http.post<ApiResponse<SavedPlace>>(`${this.apiUrl}/places/${userProf.id}/name/${userProf.name}/email/${userProf.email}/places`, request)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Convert dateAdded string back to Date object
            response.data.dateAdded = new Date(response.data.dateAdded);
            return response.data;
          }
          throw new Error(response.message || 'Failed to save place');
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Remove a place from backend
   */
  removePlace(userId: string, placeId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/places/${userId}/places/${placeId}`)
      .pipe(
        map(response => {
          if (response.success) {
            return true;
          }
          throw new Error(response.message || 'Failed to remove place');
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Server Error: ${error.status} - ${error.message}`;
      }
    }

    console.error('PlacesService Error:', error);
    alert(errorMessage); // Display error via alert as requested

    return throwError(() => new Error(errorMessage));
  }
}
