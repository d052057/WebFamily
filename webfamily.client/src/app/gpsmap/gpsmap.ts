// Enhanced GPSMapComponent with Search Feature and Zoom Controls

import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import * as L from 'leaflet';
import { GPSDistanceService, GPSCoordinate, TriangleResult } from './services/gpsdistance';
import { FormsModule } from '@angular/forms';

import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  type: string;
  importance: number;
  photos?: LocationPhoto[];
}

interface LocationPhoto {
  url: string;
  thumbnail: string;
  description: string;
  photographer: string;
}

@Component({
  selector: 'app-gps-map',
  imports: [FormsModule],
  templateUrl: './gpsmap.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './gpsmap.scss'
})
export class GPSMapComponent implements OnInit, AfterViewInit {

  private map!: L.Map;
  private markersLayer!: L.LayerGroup;
  private linesLayer!: L.LayerGroup;
  private searchResultsLayer!: L.LayerGroup;

  // Search functionality
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showSearchResults = false;
  isSearching = false;
  showPhotos = false;
  selectedLocationPhotos: LocationPhoto[] = [];
  private searchSubject = new Subject<string>();

  // Current active point for search
  activeSearchPoint: 'A' | 'B' | 'C' | null = null;

  // Default coordinates (NYC, LA, Chicago)
  pointA: GPSCoordinate = { latitude: 40.7128, longitude: -74.0060 };
  pointB: GPSCoordinate = { latitude: 34.0522, longitude: -118.2437 };
  pointC: GPSCoordinate = { latitude: 41.8781, longitude: -87.6298 };

  results = false;
  twoPointDistance: any = null;
  triangleResult: TriangleResult | null = null;

  constructor(
    private gpsService: GPSDistanceService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.setupSearch();
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.trim().length < 3) {
          return of([]);
        }
        return this.searchLocation(query);
      })
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
        this.showSearchResults = results.length > 0;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.isSearching = false;
        this.showSearchResults = false;
      }
    });
  }

  private searchLocation(query: string) {
    this.isSearching = true;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&addressdetails=1`;

    return this.http.get<SearchResult[]>(url);
  }

  private async searchLocationPhotos(locationName: string): Promise<LocationPhoto[]> {
    try {
      // Using Unsplash API (you'd need to get a free API key)
      // For demo purposes, we'll use a placeholder service
      const searchTerm = locationName.split(',')[0].trim(); // Get main location name

      // Alternative: Use Lorem Picsum for demo photos
      const photos: LocationPhoto[] = [
        {
          url: `https://picsum.photos/800/600?random=${Math.floor(Math.random() * 1000)}`,
          thumbnail: `https://picsum.photos/200/150?random=${Math.floor(Math.random() * 1000)}`,
          description: `Photo of ${searchTerm}`,
          photographer: 'Lorem Picsum'
        },
        {
          url: `https://picsum.photos/800/600?random=${Math.floor(Math.random() * 1000)}`,
          thumbnail: `https://picsum.photos/200/150?random=${Math.floor(Math.random() * 1000)}`,
          description: `Another view of ${searchTerm}`,
          photographer: 'Lorem Picsum'
        }
      ];

      return photos;
    } catch (error) {
      console.error('Error fetching photos:', error);
      return [];
    }
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  async selectSearchResult(result: SearchResult): Promise<void> {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (this.activeSearchPoint) {
      // Update the selected point
      switch (this.activeSearchPoint) {
        case 'A':
          this.pointA = { latitude: lat, longitude: lon };
          break;
        case 'B':
          this.pointB = { latitude: lat, longitude: lon };
          break;
        case 'C':
          this.pointC = { latitude: lat, longitude: lon };
          break;
      }
    }

    // Load photos for this location
    const photos = await this.searchLocationPhotos(result.display_name);
    result.photos = photos;

    // Add a temporary marker to show the selected location
    this.addSearchMarker(lat, lon, result.display_name, photos);

    // Center map on the selected location with smooth animation
    this.map.setView([lat, lon], 12, { animate: true, duration: 1 });

    // Clear search
    this.clearSearch();
  }

  private addSearchMarker(lat: number, lon: number, name: string, photos?: LocationPhoto[]): void {
    this.searchResultsLayer.clearLayers();

    let popupContent = `
      <div class="marker-popup">
        <h4>Selected Location</h4>
        <p><strong>${name}</strong></p>
        <p>Lat: ${lat.toFixed(6)}<br>Lng: ${lon.toFixed(6)}</p>
    `;

    if (photos && photos.length > 0) {
      popupContent += `
        <div class="popup-photos">
          <h5>Photos:</h5>
          <div class="photo-grid">
            ${photos.map(photo => `
              <img src="${photo.thumbnail}" 
                   alt="${photo.description}" 
                   title="${photo.description} by ${photo.photographer}"
                   class="popup-photo"
                   onclick="window.open('${photo.url}', '_blank')">
            `).join('')}
          </div>
        </div>
      `;
    }

    popupContent += `</div>`;

    const marker = L.marker([lat, lon], {
      icon: this.createColoredIcon('orange')
    }).bindPopup(popupContent, { maxWidth: 300 });

    this.searchResultsLayer.addLayer(marker);
  }

  setActiveSearchPoint(point: 'A' | 'B' | 'C'): void {
    this.activeSearchPoint = point;
    this.searchQuery = '';
    this.showSearchResults = false;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
    this.activeSearchPoint = null;
    this.isSearching = false;
  }

  clearSearchMarkers(): void {
    this.searchResultsLayer.clearLayers();
  }

  // Zoom control methods
  zoomIn(): void {
    this.map.zoomIn();
  }

  zoomOut(): void {
    this.map.zoomOut();
  }

  resetZoom(): void {
    this.map.setView([39.8283, -98.5795], 4, { animate: true, duration: 1 });
  }

  getCurrentZoom(): number {
    return this.map.getZoom();
  }

  setZoomLevel(level: number): void {
    this.map.setZoom(level, { animate: true });
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

  private initializeMap(): void {
    // Initialize the map with enhanced zoom options
    this.map = L.map('map', {
      center: [39.8283, -98.5795], // Center of USA
      zoom: 4,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: true, // Enable default zoom control
      scrollWheelZoom: true, // Enable mouse wheel zoom
      doubleClickZoom: true, // Enable double-click zoom
      touchZoom: true, // Enable touch zoom on mobile
      boxZoom: true, // Enable box zoom (Shift + drag)
      keyboard: true, // Enable keyboard navigation
      zoomAnimation: true, // Enable zoom animations
      zoomAnimationThreshold: 4, // Threshold for zoom animations
      fadeAnimation: true, // Enable fade animations
      markerZoomAnimation: true // Enable marker zoom animations
    });

    // Add custom zoom event listeners
    this.map.on('zoomstart', () => {
      console.log('Zoom started');
    });

    this.map.on('zoomend', () => {
      console.log('Current zoom level:', this.map.getZoom());
    });

    // Add mouse wheel zoom with custom options
    this.map.on('wheel', (e) => {
      // You can add custom wheel zoom behavior here if needed
      // The default behavior is already enabled above
    });

    // Define different map layers
    const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    });

    const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      maxZoom: 18
    });

    const hybridMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      maxZoom: 18
    });

    const hybridLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: '',
      maxZoom: 18
    });

    // Add default layer
    streetMap.addTo(this.map);

    // Create layer control
    const baseMaps = {
      "Street Map": streetMap,
      "Satellite": satelliteMap,
      "Hybrid": L.layerGroup([hybridMap, hybridLabels])
    };

    L.control.layers(baseMaps).addTo(this.map);

    // Add scale control
    L.control.scale({
      metric: true,
      imperial: true,
      position: 'bottomleft'
    }).addTo(this.map);

    // Initialize layers for markers, lines, and search results
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.linesLayer = L.layerGroup().addTo(this.map);
    this.searchResultsLayer = L.layerGroup().addTo(this.map);

    // Fix marker icons (Leaflet issue with bundlers)
    this.fixLeafletIcons();

    // Add click handler for manual point placement
    this.map.on('click', (e) => {
      if (this.activeSearchPoint) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

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

    // Add fullscreen control (optional)
    this.addFullscreenControl();
  }

  private addFullscreenControl(): void {
    const fullscreenControl = new (L.Control.extend({
      options: {
        position: 'topright'
      },

      onAdd: (map: L.Map) => {
        const div = L.DomUtil.create('div', 'leaflet-control-fullscreen leaflet-bar');
        div.innerHTML = '<a href="#" title="Toggle Fullscreen" role="button" aria-label="Toggle fullscreen">⛶</a>';

        L.DomEvent.on(div, 'click', (e: Event) => {
          L.DomEvent.preventDefault(e);
          this.toggleFullscreen();
        });

        // Prevent map click events when clicking the control
        L.DomEvent.disableClickPropagation(div);

        return div;
      }
    }))();

    fullscreenControl.addTo(this.map);
  }

  private toggleFullscreen(): void {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    if (!document.fullscreenElement) {
      mapElement.requestFullscreen().then(() => {
        // Invalidate size after entering fullscreen
        setTimeout(() => {
          this.map.invalidateSize();
        }, 100);
      });
    } else {
      document.exitFullscreen().then(() => {
        // Invalidate size after exiting fullscreen
        setTimeout(() => {
          this.map.invalidateSize();
        }, 100);
      });
    }
  }

  private fixLeafletIcons(): void {
    // Fix for default markers not showing in bundled apps
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
  }

  calculate2Points(): void {
    this.clearMap();

    // Calculate distance
    this.twoPointDistance = this.gpsService.calculateDistance(this.pointA, this.pointB);
    this.triangleResult = null;
    this.results = true;

    // Add markers
    const markerA = L.marker([this.pointA.latitude, this.pointA.longitude], {
      icon: this.createColoredIcon('red')
    }).bindPopup(`Point A<br>Lat: ${this.pointA.latitude}<br>Lng: ${this.pointA.longitude}`);

    const markerB = L.marker([this.pointB.latitude, this.pointB.longitude], {
      icon: this.createColoredIcon('green')
    }).bindPopup(`Point B<br>Lat: ${this.pointB.latitude}<br>Lng: ${this.pointB.longitude}`);

    this.markersLayer.addLayer(markerA);
    this.markersLayer.addLayer(markerB);

    // Add line
    const line = L.polyline([
      [this.pointA.latitude, this.pointA.longitude],
      [this.pointB.latitude, this.pointB.longitude]
    ], { color: 'blue', weight: 3 }).bindPopup(`Distance: ${this.twoPointDistance.kilometers} km`);

    this.linesLayer.addLayer(line);

    // Fit map to show all points
    this.fitMapToPoints([this.pointA, this.pointB]);
  }

  calculate3Points(): void {
    this.clearMap();

    // Calculate triangle
    this.triangleResult = this.gpsService.calculateTriangle(this.pointA, this.pointB, this.pointC);
    this.twoPointDistance = null;
    this.results = true;

    // Add markers
    const markerA = L.marker([this.pointA.latitude, this.pointA.longitude], {
      icon: this.createColoredIcon('red')
    }).bindPopup(`Point A<br>Lat: ${this.pointA.latitude}<br>Lng: ${this.pointA.longitude}`);

    const markerB = L.marker([this.pointB.latitude, this.pointB.longitude], {
      icon: this.createColoredIcon('green')
    }).bindPopup(`Point B<br>Lat: ${this.pointB.latitude}<br>Lng: ${this.pointB.longitude}`);

    const markerC = L.marker([this.pointC.latitude, this.pointC.longitude], {
      icon: this.createColoredIcon('blue')
    }).bindPopup(`Point C<br>Lat: ${this.pointC.latitude}<br>Lng: ${this.pointC.longitude}`);

    this.markersLayer.addLayer(markerA);
    this.markersLayer.addLayer(markerB);
    this.markersLayer.addLayer(markerC);

    // Add triangle lines
    const triangle = L.polygon([
      [this.pointA.latitude, this.pointA.longitude],
      [this.pointB.latitude, this.pointB.longitude],
      [this.pointC.latitude, this.pointC.longitude]
    ], {
      color: 'red',
      weight: 2,
      fillColor: 'red',
      fillOpacity: 0.1
    }).bindPopup(`Area: ${this.triangleResult.area.squareKilometers} km²`);

    this.linesLayer.addLayer(triangle);

    // Fit map to show all points
    this.fitMapToPoints([this.pointA, this.pointB, this.pointC]);
  }

  clearMap(): void {
    this.markersLayer.clearLayers();
    this.linesLayer.clearLayers();
    this.searchResultsLayer.clearLayers();
    this.results = false;
    this.twoPointDistance = null;
    this.triangleResult = null;
  }

  private createColoredIcon(color: string) {
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10]
    });
  }

  private fitMapToPoints(points: GPSCoordinate[]): void {
    const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
    this.map.fitBounds(bounds, { padding: [20, 20] });
  }
}
