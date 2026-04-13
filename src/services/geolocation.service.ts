/**
 * GeolocationService — Handles GPS-based distance calculations.
 * Strategy pattern: reservation timeout is calculated based on distance.
 * 
 * Uses Haversine formula for distance, then estimates travel time
 * assuming average urban speed of 30 km/h + buffer.
 */

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distanceKm: number;
  estimatedMinutes: number;
  reservationTimeoutMinutes: number;
}

const EARTH_RADIUS_KM = 6371;
const AVG_URBAN_SPEED_KMH = 25; // conservative urban speed
const MIN_RESERVATION_MINUTES = 10;
const MAX_RESERVATION_MINUTES = 60;
const BUFFER_MULTIPLIER = 1.3; // 30% buffer for traffic

/**
 * Haversine distance between two GPS coordinates.
 */
function haversineDistance(a: GeoCoordinates, b: GeoCoordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Estimate travel time in minutes based on distance.
 * Uses average urban speed with a traffic buffer.
 */
function estimateTravelMinutes(distanceKm: number): number {
  const rawMinutes = (distanceKm / AVG_URBAN_SPEED_KMH) * 60;
  return Math.ceil(rawMinutes * BUFFER_MULTIPLIER);
}

/**
 * Calculate reservation timeout based on distance between user and parking.
 * Clamps result between MIN and MAX reservation minutes.
 */
export function calculateReservationTimeout(
  userLocation: GeoCoordinates,
  parkingLocation: GeoCoordinates
): DistanceResult {
  const distanceKm = haversineDistance(userLocation, parkingLocation);
  const estimatedMinutes = estimateTravelMinutes(distanceKm);
  const reservationTimeoutMinutes = Math.max(
    MIN_RESERVATION_MINUTES,
    Math.min(MAX_RESERVATION_MINUTES, estimatedMinutes)
  );

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    estimatedMinutes,
    reservationTimeoutMinutes,
  };
}

/**
 * Get the user's current GPS position.
 * Returns a Promise that resolves with coordinates or rejects if unavailable.
 */
export function getUserLocation(): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no disponible en este navegador'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Permiso de ubicación denegado. Actívalo en la configuración del navegador.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Ubicación no disponible'));
            break;
          case error.TIMEOUT:
            reject(new Error('Tiempo de espera agotado al obtener ubicación'));
            break;
          default:
            reject(new Error('Error al obtener ubicación'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export const GeolocationService = {
  getUserLocation,
  calculateReservationTimeout,
  haversineDistance,
} as const;
