export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  type: string;
  importance: number;
  photos?: LocationPhoto[];
}

export interface LocationPhoto {
  url: string;
  thumbnail: string;
  description: string;
  photographer: string;
}

export interface GoogleMapsPlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: any[];
  rating?: number;
  types: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  savedPlaces: SavedPlace[];
}
export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'home' | 'work' | 'favorite' | 'custom' | 'neighborhood';
  notes?: string;
  dateAdded: Date;
}
export interface SavePlaceRequest {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
}

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
}

export interface DistanceResult {
  kilometers: number;
  miles: number;
  meters: number;
}

export interface TriangleResult {
  distances: {
    side1: DistanceResult; // Point A to Point B
    side2: DistanceResult; // Point B to Point C
    side3: DistanceResult; // Point C to Point A
  };
  perimeter: DistanceResult;
  area: {
    squareKilometers: number;
    squareMiles: number;
    squareMeters: number;
    hectares: number;
  };
}
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}
