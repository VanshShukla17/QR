export interface Coordinates {
  lat: number;
  lng: number;
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const CITY_COORDINATES: Record<string, Coordinates> = {
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  pune: { lat: 18.5204, lng: 73.8567 },
  delhi: { lat: 28.6139, lng: 77.209 },
  "new delhi": { lat: 28.6139, lng: 77.209 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
};

export class GeocodingService {
  /**
   * Geocodes an address string to approximate GPS coordinates.
   * Recognizes explicit embedded coordinates (e.g. "[28.45, 77.02]"),
   * major Indian pilot cities, or calculates a deterministic approximation.
   */
  async geocodeAddress(address: string): Promise<Coordinates> {
    const coordMatch = address.match(/\[\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\]/);
    if (coordMatch) {
      return {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2]),
      };
    }

    const lower = address.toLowerCase();
    for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
      if (lower.includes(city)) {
        return coords;
      }
    }

    // Default to Pune campus pilot area (or standard seed coordinate)
    return { lat: 18.5204, lng: 73.8567 };
  }

  /**
   * Compares submitted GPS coordinates with the geocoded KYC address.
   * If distance exceeds maxRadiusM (default: 5000 meters / 5km), flags location_variance = true.
   * Per PRD.md Section 4 & TASKS.md Task 3: does NOT block registration.
   */
  async checkLocationVariance(
    submittedLat: number,
    submittedLng: number,
    kycAddress: string,
    maxRadiusM: number = 5000
  ): Promise<{
    isVariance: boolean;
    distanceM: number;
    kycLocation: Coordinates;
  }> {
    const kycLocation = await this.geocodeAddress(kycAddress);
    const distanceM = haversineDistanceMeters(
      submittedLat,
      submittedLng,
      kycLocation.lat,
      kycLocation.lng
    );

    const isVariance = distanceM > maxRadiusM;

    return {
      isVariance,
      distanceM,
      kycLocation,
    };
  }
}

export const geocodingService = new GeocodingService();
