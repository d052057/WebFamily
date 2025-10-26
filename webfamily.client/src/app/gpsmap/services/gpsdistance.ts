import { Injectable } from '@angular/core';

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

@Injectable({
  providedIn: 'root'
})
export class GPSDistanceService {
  
  private readonly EARTH_RADIUS_KM = 6371;
  private readonly EARTH_RADIUS_MILES = 3959;
  private readonly KM_TO_MILES = 0.621371;
  private readonly KM_TO_METERS = 1000;
  private readonly SQM_TO_HECTARES = 10000;

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * @param point1 First GPS coordinate
   * @param point2 Second GPS coordinate
   * @returns Distance in kilometers, miles, and meters
   */
  calculateDistance(point1: GPSCoordinate, point2: GPSCoordinate): DistanceResult {
    const distanceKm = this.haversineDistance(point1, point2);
    
    return {
      kilometers: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
      miles: Math.round(distanceKm * this.KM_TO_MILES * 100) / 100,
      meters: Math.round(distanceKm * this.KM_TO_METERS)
    };
  }

  /**
   * Haversine formula implementation
   * @param point1 First GPS coordinate
   * @param point2 Second GPS coordinate
   * @returns Distance in kilometers
   */
  private haversineDistance(point1: GPSCoordinate, point2: GPSCoordinate): number {
    // Convert degrees to radians
    const lat1Rad = this.degreesToRadians(point1.latitude);
    const lon1Rad = this.degreesToRadians(point1.longitude);
    const lat2Rad = this.degreesToRadians(point2.latitude);
    const lon2Rad = this.degreesToRadians(point2.longitude);

    // Calculate differences
    const deltaLat = lat2Rad - lat1Rad;
    const deltaLon = lon2Rad - lon1Rad;

    // Haversine formula
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Simple Euclidean approximation for short distances (<20km)
   * @param point1 First GPS coordinate
   * @param point2 Second GPS coordinate
   * @returns Distance in kilometers
   */
  calculateDistanceSimple(point1: GPSCoordinate, point2: GPSCoordinate): number {
    const deltaLat = point2.latitude - point1.latitude;
    const deltaLon = point2.longitude - point1.longitude;
    const avgLat = this.degreesToRadians((point1.latitude + point2.latitude) / 2);
    
    const latDistance = deltaLat * 111.32;
    const lonDistance = deltaLon * 111.32 * Math.cos(avgLat);
    
    return Math.sqrt(latDistance * latDistance + lonDistance * lonDistance);
  }

  /**
   * Convert degrees to radians
   * @param degrees Angle in degrees
   * @returns Angle in radians
   */
  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   * @param radians Angle in radians
   * @returns Angle in degrees
   */
  private radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Calculate triangle properties from 3 GPS coordinates
   * @param pointA First GPS coordinate
   * @param pointB Second GPS coordinate  
   * @param pointC Third GPS coordinate
   * @returns Triangle distances and area
   */
  calculateTriangle(pointA: GPSCoordinate, pointB: GPSCoordinate, pointC: GPSCoordinate): TriangleResult {
    // Calculate the three sides
    const sideAB = this.calculateDistance(pointA, pointB);
    const sideBC = this.calculateDistance(pointB, pointC);
    const sideCA = this.calculateDistance(pointC, pointA);
    
    // Calculate perimeter
    const perimeterKm = sideAB.kilometers + sideBC.kilometers + sideCA.kilometers;
    const perimeterResult: DistanceResult = {
      kilometers: Math.round(perimeterKm * 100) / 100,
      miles: Math.round(perimeterKm * this.KM_TO_MILES * 100) / 100,
      meters: Math.round(perimeterKm * this.KM_TO_METERS)
    };

    // Calculate area using spherical excess formula for accurate results on Earth's surface
    const areaKm2 = this.calculateSphericalTriangleArea(pointA, pointB, pointC);
    
    return {
      distances: {
        side1: sideAB,
        side2: sideBC,
        side3: sideCA
      },
      perimeter: perimeterResult,
      area: {
        squareKilometers: Math.round(areaKm2 * 100) / 100,
        squareMiles: Math.round(areaKm2 * this.KM_TO_MILES * this.KM_TO_MILES * 100) / 100,
        squareMeters: Math.round(areaKm2 * this.KM_TO_METERS * this.KM_TO_METERS),
        hectares: Math.round(areaKm2 * 100 * 100) / 100 // 1 km² = 100 hectares
      }
    };
  }

  /**
   * Calculate spherical triangle area using spherical excess
   * More accurate than planar calculations for large triangles
   * @param pointA First GPS coordinate
   * @param pointB Second GPS coordinate
   * @param pointC Third GPS coordinate
   * @returns Area in square kilometers
   */
  private calculateSphericalTriangleArea(pointA: GPSCoordinate, pointB: GPSCoordinate, pointC: GPSCoordinate): number {
    // Convert to radians
    const lat1 = this.degreesToRadians(pointA.latitude);
    const lon1 = this.degreesToRadians(pointA.longitude);
    const lat2 = this.degreesToRadians(pointB.latitude);
    const lon2 = this.degreesToRadians(pointB.longitude);
    const lat3 = this.degreesToRadians(pointC.latitude);
    const lon3 = this.degreesToRadians(pointC.longitude);

    // Calculate the spherical excess using L'Huilier's theorem
    const a = this.haversineDistance(pointA, pointB) / this.EARTH_RADIUS_KM; // Angular distance
    const b = this.haversineDistance(pointB, pointC) / this.EARTH_RADIUS_KM;
    const c = this.haversineDistance(pointC, pointA) / this.EARTH_RADIUS_KM;
    
    const s = (a + b + c) / 2; // Semi-perimeter
    
    // L'Huilier's formula for spherical excess
    const E = 4 * Math.atan(Math.sqrt(
      Math.tan(s / 2) * 
      Math.tan((s - a) / 2) * 
      Math.tan((s - b) / 2) * 
      Math.tan((s - c) / 2)
    ));
    
    // Area = E * R²
    return E * this.EARTH_RADIUS_KM * this.EARTH_RADIUS_KM;
  }

  /**
   * Alternative planar approximation for smaller triangles (<100km sides)
   * Uses Heron's formula - faster but less accurate for large areas
   * @param pointA First GPS coordinate
   * @param pointB Second GPS coordinate
   * @param pointC Third GPS coordinate
   * @returns Area in square kilometers
   */
  /**
   * Calculate bearing between two points
   * @param point1 Starting point
   * @param point2 Ending point
   * @returns Bearing in degrees (0-360)
   */
  calculateBearing(point1: GPSCoordinate, point2: GPSCoordinate): number {
    const lat1Rad = this.degreesToRadians(point1.latitude);
    const lat2Rad = this.degreesToRadians(point2.latitude);
    const deltaLonRad = this.degreesToRadians(point2.longitude - point1.longitude);

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    const bearingRad = Math.atan2(y, x);
    const bearingDeg = this.radiansToDegrees(bearingRad);
    
    return (bearingDeg + 360) % 360; // Normalize to 0-360
  }
}

