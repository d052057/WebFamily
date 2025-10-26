// Enhanced GPSMapComponent with Google Maps, Search Feature, and Profile Integration

import { Component, OnInit, AfterViewInit, inject, signal } from '@angular/core';
import { GoogleGPSDistanceService} from './services/googlegpsdistance';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { GoogleMapsModule } from '@angular/google-maps';
import { UserProfile, SavedPlace, SearchResult, GPSCoordinate, TriangleResult } from './interfaces/googlemapgps.interface';  
import { PlacesService } from './services/places.service';
import { AccountService } from './../account/account.service';
import { SharedService } from './../shared/shared.service';
import { jwtDecode } from 'jwt-decode';
import { MatIconModule } from '@angular/material/icon';
import { VoiceDirective } from '../shared/directives/voice.directive';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { languages } from '../../app/models/languages';

declare var google: any;

@Component({
  selector: 'app-googlegpsmap',
  imports: [MatSelectModule, MatFormFieldModule, MatInputModule, VoiceDirective, MatIconModule, FormsModule, GoogleMapsModule, DecimalPipe, TitleCasePipe, DatePipe],
  templateUrl: './googlegpsmap.html',
  styleUrl: './googlegpsmap.scss'
})
export class Googlegpsmap implements OnInit, AfterViewInit {
  private gpsService = inject(GoogleGPSDistanceService);
  private placesService = inject(PlacesService);
  private accountService = inject(AccountService);
  private sharedService = inject(SharedService);
  private http = inject(HttpClient);
  private map!: any;
  private markers: any[] = [];
  private polylines: any[] = [];
  private googlePlacesService!: any;
  private geocoder!: any;
  private infoWindow!: any;
  private readonly googleMapApi = this.gpsService.googleMapApi;
  // User Profile
  userProfile: UserProfile | any | null = null;
  profile: UserProfile | any | null = null; 
  private currentUserId: string | null = null;  

  // Search functionality
  searchQuery = signal('');
  searchResults: SearchResult[] = [];
  showSearchResults = false;
  isLoading = false;
  isSearching = false;
  private searchSubject = new Subject<string>();
  // Current active point for search
  activeSearchPoint: 'A' | 'B' | 'C' | null = null;
  // Default coordinates (NYC, LA, Chicago)
  pointA: GPSCoordinate = { latitude: 47.469313622021524, longitude: -122.1095364043383 };
  pointB: GPSCoordinate = { latitude: 13.4124693, longitude: 103.8669857 };
  pointC: GPSCoordinate = { latitude: 13.5836237, longitude: 102.9737739 };

  results = false;
  twoPointDistance: any = null;
  triangleResult: TriangleResult | null = null;


  isUserSpeaking: boolean = false;
  langData = languages;
  langSelected: number = 0;
  langSearch: string = this.langData[this.langSelected].search;
  searchVal = signal('');
  constructor(
  ) { }

  ngOnInit(): void {
    this.currentUserId = 'default';
    this.profile = {
      id: 'default',
      name: "Default User",
      email: "noemail@example.com",
      savedPlaces: []
    };
    this.refreshUser();
    this.accountService.user$.subscribe(user => {
      if (user) {
        const decodedToken: any = jwtDecode(user.jwt);
        //console.log('All claims:', Object.keys(decodedToken));
        const email = decodedToken.email; // Much cleaner!
       
        const firstName = decodedToken.given_name;
        const lastName = decodedToken.family_name;
        const nameId = decodedToken.nameid;
        const role = decodedToken.role;
        const name = (firstName + lastName).toLowerCase();
        //console.log('email:', email);
        //console.log('firstName:', firstName);
        //console.log('lastName:', lastName);
        //console.log('nameId:', nameId);
        //console.log('role:', role);
        this.currentUserId = name; // Use nameId as user ID
        this.profile = {
          id: this.currentUserId,
          name: firstName + ' ' + lastName,
          email: email,
          savedPlaces: []
        };
      }

    });
    this.setupSearch();
    this.loadGoogleMapsScript();
   
    this.loadUserPlaces(this.profile);
  }

  ngAfterViewInit(): void {
    // Map initialization will be called after Google Maps script loads
  }
  private refreshUser() {
    const jwt = this.accountService.getJWT();
    if (jwt) {
      this.accountService.refreshUser(jwt).subscribe({
        next: _ => { },
        error: error => {
          this.accountService.logout();
          this.sharedService.showNotification(false, 'Account blocked', error.error);
        }
      })
    } else {
      this.accountService.refreshUser(null).subscribe();
    }
  }
  private loadUserPlaces(userProf: UserProfile): void {
    this.isLoading = true;
    this.placesService.getUserPlaces(userProf).subscribe({
      next: (userProfile: UserProfile) => {
        this.userProfile = userProfile;
        this.profile = userProfile; // Update profile with loaded places  
        this.isLoading = false;
        console.log('User places loaded:', userProfile);
      },
      error: (error: any) => {
        console.error('Error loading user places:', error);
        this.isLoading = false;
        // Error already displayed via alert in service
      }
    });
  }
  private loadGoogleMapsScript(): void {
    if (typeof google !== 'undefined') {
      this.initializeGoogleMap();
      return;
    }

    // Replace 'YOUR_API_KEY' with your actual Google Maps API key
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.googleMapApi}&libraries=places&callback=initGoogleMap`;
    script.async = true;
    script.defer = true;

    // Create global callback
    (window as any).initGoogleMap = () => {
      this.initializeGoogleMap();
    };

    document.head.appendChild(script);
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        // Clear results immediately for empty/short queries
        if (query.trim().length < 3) {
          this.showSearchResults = false;
          this.searchResults = [];
          this.isSearching = false;
          return of([]);
        }

        // Set searching state but don't clear results yet
        this.isSearching = true;
        return this.searchLocation(query);
      })
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
        // Only show results if we have actual results
        this.showSearchResults = results.length > 0;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.isSearching = false;
        this.showSearchResults = false;
        this.searchResults = [];
      }
    });
  }

  private searchLocation(query: string) {
    // Remove the isSearching = true from here since it's already set in setupSearch

    // Use Google Places API if available, otherwise fallback to Nominatim
    if (this.googlePlacesService) {
      return this.searchWithGooglePlaces(query);
    } else {
      return this.searchWithNominatim(query);
    }
  }

  private searchWithGooglePlaces(query: string) {
    return new Promise<SearchResult[]>((resolve) => {
      const request = {
        query: query,
        fields: ['name', 'geometry', 'formatted_address', 'place_id', 'photos', 'rating', 'types']
      };

      this.googlePlacesService.textSearch(request, (results: any[], status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const searchResults: SearchResult[] = results.slice(0, 5).map(place => ({
            display_name: place.formatted_address || place.name,
            lat: place.geometry.location.lat().toString(),
            lon: place.geometry.location.lng().toString(),
            place_id: place.place_id,
            type: place.types[0] || 'location',
            importance: place.rating || 0
          }));
          resolve(searchResults);
        } else {
          resolve([]);
        }
      });
    });
  }

  private searchWithNominatim(query: string) {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&addressdetails=1`;
    return this.http.get<SearchResult[]>(url).pipe(
      // Add error handling for network issues
      catchError(error => {
        console.error('Nominatim search error:', error);
        return of([]);
      })
    );
  }

  onSearchInput(searchStr: string): void {
    this.searchQuery.set(searchStr.trim());
    // Don't trigger search if query is empty or too short
    if (this.searchQuery().trim().length === 0) {
      this.showSearchResults = false;
      this.searchResults = [];
      this.isSearching = false;
      return;
    }

    this.searchSubject.next(this.searchQuery());
  }

  async selectSearchResult(result: SearchResult): Promise<void> {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (this.activeSearchPoint) {
      // Update the selected point
      switch (this.activeSearchPoint) {
        case 'A':
          this.pointA = { latitude: lat, longitude: lng };
          break;
        case 'B':
          this.pointB = { latitude: lat, longitude: lng };
          break;
        case 'C':
          this.pointC = { latitude: lat, longitude: lng };
          break;
      }
    }

    // Add marker to map
    this.addSearchMarker(lat, lng, result.display_name);

    // Center map on the selected location
    this.map.setCenter({ lat: lat, lng: lng });
    this.map.setZoom(12);

    // Clear search
    this.clearSearch();
  }

  private addSearchMarker(lat: number, lng: number, name: string): void {

    this.resetMapMode();
    // Clear existing search markers
    this.clearSearchMarkers();

    const marker = new google.maps.Marker({
      position: { lat: lat, lng: lng },
      map: this.map,
      title: name,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'
      }
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div>
          <h4>Selected Location</h4>
          <p><strong>${name}</strong></p>
          <p>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}</p>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(this.map, marker);
    });

    this.markers.push(marker);
  }

  setActiveSearchPoint(point: 'A' | 'B' | 'C'): void {
    this.activeSearchPoint = point;
    this.searchQuery.set('');
    this.showSearchResults = false;
  }

  private resetMapMode(): void {
    // Exit Street View
    const streetView = this.map.getStreetView();
    if (streetView.getVisible()) {
      streetView.setVisible(false);
    }

    // Reset map type to normal if needed
    this.map.setMapTypeId(google.maps.MapTypeId.ROADMAP);

    // Ensure map is in normal interaction mode
    this.map.setOptions({
      draggable: true,
      zoomControl: true,
      scrollwheel: true,
      disableDoubleClickZoom: false
    });
  }
  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults = [];
    this.showSearchResults = false;
    this.activeSearchPoint = null;
    this.isSearching = false;
    // Cancel any pending searches
    this.searchSubject.next('');
  }
  clearSearchMarkers(): void {
    // Clear only orange markers (search results)
    this.resetMapMode();
    this.markers = this.markers.filter(marker => {
      if (marker.getIcon()?.url?.includes('orange-dot')) {
        marker.setMap(null);
        return false;
      }
      return true;
    });
  }

 
  async signInWithGoogle(): Promise<void> {
    try {
      // This would integrate with Google Sign-In API
      // For now, we'll simulate a user profile and load from backend
      const userId = 'admin'; // This would come from Google Sign-In

      // Load user places from backend
      this.loadUserPlaces(this.profile);

      // Update user profile info (this part would come from Google Sign-In)
      // The places will be loaded from backend via loadUserPlaces

    } catch (error) {
      console.error('Error signing in:', error);
      alert('Error signing in. Please try again.');
    }
  }
  signOut(): void {
    this.userProfile = null;
    // In a real implementation, you would sign out from Google
    console.log('User signed out');
    this.loadUserPlaces(this.profile);
  }


  savePlace(result: SearchResult): void {
    if (!this.userProfile || this.userProfile.id === 'default') {
      alert('Please sign in to save places');
      return;
    }

    this.isLoading = true;
    this.placesService.savePlace(this.userProfile, result).subscribe({
      next: (savedPlace: any) => {
        if (this.userProfile) {
          this.userProfile.savedPlaces.push(savedPlace);
          console.log('Place saved:', savedPlace);
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error saving place:', error);
        this.isLoading = false;
        // Error already displayed via alert in service
      }
    });
  }
  loadSavedPlace(place: SavedPlace): void {
    if (this.activeSearchPoint) {
      switch (this.activeSearchPoint) {
        case 'A':
          this.pointA = { latitude: place.lat, longitude: place.lng };
          break;
        case 'B':
          this.pointB = { latitude: place.lat, longitude: place.lng };
          break;
        case 'C':
          this.pointC = { latitude: place.lat, longitude: place.lng };
          break;
      }
    }

    // Add marker and center map
    this.addSearchMarker(place.lat, place.lng, place.name);
    this.map.setCenter({ lat: place.lat, lng: place.lng });
    this.map.setZoom(12);
  }

  /**
  * Remove saved place from backend
  */
  removeSavedPlace(placeId: string): void {
    if (!this.userProfile) {
      alert('Please sign in to remove places');
      return;
    }

    // Don't allow removing for default user
    if (this.userProfile.id === 'default') {
      alert('Please sign in to remove places');
      return;
    }

    this.isLoading = true;
    this.placesService.removePlace(this.userProfile.id, placeId).subscribe({
      next: () => {
        if (this.userProfile) {
          this.userProfile.savedPlaces = this.userProfile.savedPlaces.filter(
            (place: any) => place.id !== placeId
          );
          console.log('Place removed:', placeId);
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error removing place:', error);
        this.isLoading = false;
        // Error already displayed via alert in service
      }
    });
  }
  getPlaceIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'home': 'bi-house-fill',
      'work': 'bi-building',
      'custom': 'bi-geo-alt-fill',
      'landmark': 'bi-star-fill',
      'market': 'bi-shop'
    };
    return iconMap[type] || 'bi-geo-alt-fill';
  }

  // Zoom control methods
  zoomIn(): void {
    this.map.setZoom(this.map.getZoom() + 1);
  }

  zoomOut(): void {
    this.map.setZoom(this.map.getZoom() - 1);
  }

  resetZoom(): void {
    this.map.setCenter({ lat: 39.8283, lng: -98.5795 });
    this.map.setZoom(4);
  }

  getCurrentZoom(): number {
    return this.map ? this.map.getZoom() : 4;
  }

  changeMapType(mapType: string): void {
    this.map.setMapTypeId(mapType);
  }

  // Enhanced coordinate input with validation
  updateCoordinate(point: 'A' | 'B' | 'C', type: 'lat' | 'lng', value: string): void {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    // Validate latitude (-90 to 90) and longitude (-180 to 180)
    if (type === 'lat' && (numValue < -90 || numValue > 90)) return;
    if (type === 'lng' && (numValue < -180 || numValue > 180)) return;

    switch (point) {
      case 'A':
        if (type === 'lat') this.pointA.latitude = numValue;
        else this.pointA.longitude = numValue;
        break;
      case 'B':
        if (type === 'lat') this.pointB.latitude = numValue;
        else this.pointB.longitude = numValue;
        break;
      case 'C':
        if (type === 'lat') this.pointC.latitude = numValue;
        else this.pointC.longitude = numValue;
        break;
    }
  }

  private initializeGoogleMap(): void {
    // Initialize the map with enhanced options
    this.map = new google.maps.Map(document.getElementById('google-map'), {
      center: { lat: 39.8283, lng: -98.5795 }, // Center of USA
      zoom: 4,
      minZoom: 2,
      maxZoom: 21, // Google Maps supports higher zoom levels
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      scrollwheel: true,
      disableDoubleClickZoom: false,
      draggable: true,
      keyboardShortcuts: true,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.TOP_CENTER,
      },
      panControl: false,
      rotateControl: false,
      scaleControl: true,
      streetViewControl: true,
      streetViewControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP,
      },
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_CENTER,
      },
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.TOP_RIGHT,
      },
      // Enhanced styling
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });

    // Initialize services
    this.googlePlacesService = new google.maps.places.PlacesService(this.map);
    this.geocoder = new google.maps.Geocoder();
    this.infoWindow = new google.maps.InfoWindow();

    // Add click handler for manual point placement
    this.map.addListener('click', (event: any) => {
      if (this.activeSearchPoint) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        switch (this.activeSearchPoint) {
          case 'A':
            this.pointA = { latitude: lat, longitude: lng };
            break;
          case 'B':
            this.pointB = { latitude: lat, longitude: lng };
            break;
          case 'C':
            this.pointC = { latitude: lat, longitude: lng };
            break;
        }

        this.addSearchMarker(lat, lng, `Point ${this.activeSearchPoint} (Manual)`);
        this.activeSearchPoint = null;
      }
    });

    // Add zoom change listener
    this.map.addListener('zoom_changed', () => {
      console.log('Current zoom level:', this.map.getZoom());
    });

    // Add map type change listener
    this.map.addListener('maptypeid_changed', () => {
      console.log('Map type changed to:', this.map.getMapTypeId());
    });

    // Initialize with user's location if available
    this.getUserLocation();
  }

  private getUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Add a marker for user's location
          const userMarker = new google.maps.Marker({
            position: userLocation,
            map: this.map,
            title: 'Your Location',
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
          });

          // Center map on user's location
          this.map.setCenter(userLocation);
          this.map.setZoom(10);

          // Add info window
          const infoWindow = new google.maps.InfoWindow({
            content: 'Your current location'
          });

          userMarker.addListener('click', () => {
            infoWindow.open(this.map, userMarker);
          });

          this.markers.push(userMarker);
        },
        (error) => {
          console.log('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000
        }
      );
    }
  }

  calculate2Points(): void {
    this.clearCalculationResults();

    // Calculate distance
    this.twoPointDistance = this.gpsService.calculateDistance(this.pointA, this.pointB);
    this.triangleResult = null;
    this.results = true;

    // Add markers
    const markerA = new google.maps.Marker({
      position: { lat: this.pointA.latitude, lng: this.pointA.longitude },
      map: this.map,
      title: 'Point A',
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
      }
    });

    const markerB = new google.maps.Marker({
      position: { lat: this.pointB.latitude, lng: this.pointB.longitude },
      map: this.map,
      title: 'Point B',
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
      }
    });

    // Add info windows
    const infoWindowA = new google.maps.InfoWindow({
      content: `<div><strong>Point A</strong><br>Lat: ${this.pointA.latitude}<br>Lng: ${this.pointA.longitude}</div>`
    });

    const infoWindowB = new google.maps.InfoWindow({
      content: `<div><strong>Point B</strong><br>Lat: ${this.pointB.latitude}<br>Lng: ${this.pointB.longitude}</div>`
    });

    markerA.addListener('click', () => {
      infoWindowA.open(this.map, markerA);
    });

    markerB.addListener('click', () => {
      infoWindowB.open(this.map, markerB);
    });

    // Add line between points
    const line = new google.maps.Polyline({
      path: [
        { lat: this.pointA.latitude, lng: this.pointA.longitude },
        { lat: this.pointB.latitude, lng: this.pointB.longitude }
      ],
      geodesic: true,
      strokeColor: '#0000FF',
      strokeOpacity: 1.0,
      strokeWeight: 3
    });

    line.setMap(this.map);

    // Add distance info window to line
    const lineInfoWindow = new google.maps.InfoWindow({
      content: `<div><strong>Distance:</strong> ${this.twoPointDistance.kilometers} km</div>`,
      position: this.getLineCenter(this.pointA, this.pointB)
    });

    line.addListener('click', (event: any) => {
      lineInfoWindow.setPosition(event.latLng);
      lineInfoWindow.open(this.map);
    });

    this.markers.push(markerA, markerB);
    this.polylines.push(line);

    // Fit map to show all points
    this.fitMapToPoints([this.pointA, this.pointB]);
  }

  calculate3Points(): void {
    this.clearCalculationResults();

    // Calculate triangle
    this.triangleResult = this.gpsService.calculateTriangle(this.pointA, this.pointB, this.pointC);
    this.twoPointDistance = null;
    this.results = true;

    // Add markers
    const markerA = new google.maps.Marker({
      position: { lat: this.pointA.latitude, lng: this.pointA.longitude },
      map: this.map,
      title: 'Point A',
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
      }
    });

    const markerB = new google.maps.Marker({
      position: { lat: this.pointB.latitude, lng: this.pointB.longitude },
      map: this.map,
      title: 'Point B',
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
      }
    });

    const markerC = new google.maps.Marker({
      position: { lat: this.pointC.latitude, lng: this.pointC.longitude },
      map: this.map,
      title: 'Point C',
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
      }
    });

    // Add info windows
    const infoWindowA = new google.maps.InfoWindow({
      content: `<div><strong>Point A</strong><br>Lat: ${this.pointA.latitude}<br>Lng: ${this.pointA.longitude}</div>`
    });

    const infoWindowB = new google.maps.InfoWindow({
      content: `<div><strong>Point B</strong><br>Lat: ${this.pointB.latitude}<br>Lng: ${this.pointB.longitude}</div>`
    });

    const infoWindowC = new google.maps.InfoWindow({
      content: `<div><strong>Point C</strong><br>Lat: ${this.pointC.latitude}<br>Lng: ${this.pointC.longitude}</div>`
    });

    markerA.addListener('click', () => {
      infoWindowA.open(this.map, markerA);
    });

    markerB.addListener('click', () => {
      infoWindowB.open(this.map, markerB);
    });

    markerC.addListener('click', () => {
      infoWindowC.open(this.map, markerC);
    });

    // Add triangle polygon
    const triangle = new google.maps.Polygon({
      paths: [
        { lat: this.pointA.latitude, lng: this.pointA.longitude },
        { lat: this.pointB.latitude, lng: this.pointB.longitude },
        { lat: this.pointC.latitude, lng: this.pointC.longitude }
      ],
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.1
    });

    triangle.setMap(this.map);

    // Add area info window
    const triangleCenter = this.getTriangleCenter(this.pointA, this.pointB, this.pointC);
    const areaInfoWindow = new google.maps.InfoWindow({
      content: `<div><strong>Area:</strong> ${this.triangleResult.area.squareKilometers} km²</div>`,
      position: triangleCenter
    });

    triangle.addListener('click', (event: any) => {
      areaInfoWindow.setPosition(event.latLng);
      areaInfoWindow.open(this.map);
    });

    this.markers.push(markerA, markerB, markerC);
    this.polylines.push(triangle);

    // Fit map to show all points
    this.fitMapToPoints([this.pointA, this.pointB, this.pointC]);
  }

  clearMap(): void {
    this.clearCalculationResults();
    this.clearSearchMarkers();
    this.results = false;
    this.twoPointDistance = null;
    this.triangleResult = null;
  }

  private clearCalculationResults(): void {
    // Clear all markers except user location marker
    this.markers.forEach(marker => {
      if (!marker.getIcon()?.url?.includes('blue-dot')) {
        marker.setMap(null);
      }
    });
    this.markers = this.markers.filter(marker =>
      marker.getIcon()?.url?.includes('blue-dot')
    );

    // Clear all polylines
    this.polylines.forEach(polyline => {
      polyline.setMap(null);
    });
    this.polylines = [];
  }

  private getLineCenter(pointA: GPSCoordinate, pointB: GPSCoordinate): google.maps.LatLng {
    const lat = (pointA.latitude + pointB.latitude) / 2;
    const lng = (pointA.longitude + pointB.longitude) / 2;
    return new google.maps.LatLng(lat, lng);
  }

  private getTriangleCenter(pointA: GPSCoordinate, pointB: GPSCoordinate, pointC: GPSCoordinate): google.maps.LatLng {
    const lat = (pointA.latitude + pointB.latitude + pointC.latitude) / 3;
    const lng = (pointA.longitude + pointB.longitude + pointC.longitude) / 3;
    return new google.maps.LatLng(lat, lng);
  }

  private fitMapToPoints(points: GPSCoordinate[]): void {
    const bounds = new google.maps.LatLngBounds();
    points.forEach(point => {
      bounds.extend(new google.maps.LatLng(point.latitude, point.longitude));
    });
    this.map.fitBounds(bounds);

    // Add some padding
    const padding = { top: 50, right: 50, bottom: 50, left: 50 };
    this.map.fitBounds(bounds, padding);
  }

  // Additional helper methods for enhanced functionality
  addCustomMarker(lat: number, lng: number, title: string, color: string = 'red'): void {
    const marker = new google.maps.Marker({
      position: { lat: lat, lng: lng },
      map: this.map,
      title: title,
      icon: {
        url: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`
      }
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `<div><strong>${title}</strong><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}</div>`
    });

    marker.addListener('click', () => {
      infoWindow.open(this.map, marker);
    });

    this.markers.push(marker);
  }

  exportResults(): void {
    const results = {
      timestamp: new Date().toISOString(),
      points: {
        A: this.pointA,
        B: this.pointB,
        C: this.pointC
      },
      calculations: {
        twoPointDistance: this.twoPointDistance,
        triangleResult: this.triangleResult
      }
    };

    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `gps_calculations_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  // Integration with Google My Maps (if needed)
  saveToMyMaps(): void {
    if (!this.userProfile) {
      alert('Please sign in to save to My Maps');
      return;
    }

    // This would integrate with Google My Maps API
    console.log('Saving to My Maps...');
    // Implementation would depend on Google My Maps API availability
  }
  onLangSelectChange(event: any) {
    this.langSearch = this.langData[this.langSelected].search;
  }
  onSearch(searchStr: string): void {
    this.searchQuery.set(searchStr);
  }
  checkMic(): void {
    this.isUserSpeaking = !this.isUserSpeaking;

  }
  onVoiceInput(transcript: string | any) {
    let currentText = this.searchQuery() + ' ' + transcript;
    this.searchQuery.set(currentText.trim());
  }
}
