import type { AgentOutput } from "@qraksha/shared";

export interface ContextAgentInput {
  liveLatitude?: number;
  liveLongitude?: number;
  boundLat?: number;
  boundLng?: number;
  boundRadiusM?: number;
}

/**
 * Calculates great-circle distance between two GPS coordinates using Haversine formula (in meters).
 */
export function calculateHaversineDistanceMeters(
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

/**
 * Context Agent:
 * Compares live GPS to registered_qr.bound_lat/lng/radius per ARCHITECTURE.md Section 2 & 8.
 * A relocation beyond bound_radius_m triggers status: "fail".
 */
export async function runContextAgent(input: ContextAgentInput): Promise<AgentOutput> {
  const { liveLatitude, liveLongitude, boundLat, boundLng, boundRadiusM = 100 } = input;

  // 1. If live GPS wasn't provided (e.g. customer check without geolocation)
  if (liveLatitude === undefined || liveLongitude === undefined) {
    if (boundLat !== undefined && boundLng !== undefined) {
      return {
        status: "fail",
        reason:
          "Location required: This QR has a registered physical location but scan coordinates were missing",
        metadata: { missingLocation: true, requiresLocation: true },
      };
    }
    return {
      status: "warn",
      reason: "Geolocation was not provided for this scan",
      metadata: { missingLocation: true },
    };
  }

  // 2. If bound coordinates are missing on the credential record
  if (boundLat === undefined || boundLng === undefined) {
    return {
      status: "warn",
      reason: "Registered QR has no bound location configured",
      metadata: { missingBoundCoordinates: true },
    };
  }

  // 3. Compute distance in meters
  const distanceMeters = calculateHaversineDistanceMeters(
    liveLatitude,
    liveLongitude,
    boundLat,
    boundLng
  );

  const isWithinRadius = distanceMeters <= boundRadiusM;

  if (isWithinRadius) {
    return {
      status: "pass",
      reason: `Location verified: ${distanceMeters}m from registered origin (within ${boundRadiusM}m radius)`,
      metadata: {
        distanceMeters,
        boundRadiusM,
        isWithinRadius: true,
      },
    };
  }

  // Out of radius: FLAGSHIP RELOCATION CASE -> status: "fail"
  return {
    status: "fail",
    reason: `QR relocation detected: scan occurred ${distanceMeters}m away from bound location (exceeds ${boundRadiusM}m radius)`,
    metadata: {
      distanceMeters,
      boundRadiusM,
      isWithinRadius: false,
    },
  };
}
