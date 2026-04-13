/**
 * useGeolocation — Hook for GPS-based reservation timeout.
 * Integrates GeolocationService with React state.
 */
import { useState, useCallback } from 'react';
import {
  getUserLocation,
  calculateReservationTimeout,
  type GeoCoordinates,
  type DistanceResult,
} from '@/services/geolocation.service';

interface UseGeolocationResult {
  userLocation: GeoCoordinates | null;
  distanceResult: DistanceResult | null;
  loading: boolean;
  error: string | null;
  calculateTimeout: (parkingLocation: GeoCoordinates) => Promise<DistanceResult>;
  clearError: () => void;
}

export function useGeolocation(): UseGeolocationResult {
  const [userLocation, setUserLocation] = useState<GeoCoordinates | null>(null);
  const [distanceResult, setDistanceResult] = useState<DistanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTimeout = useCallback(async (parkingLocation: GeoCoordinates): Promise<DistanceResult> => {
    setLoading(true);
    setError(null);
    try {
      const location = await getUserLocation();
      setUserLocation(location);
      const result = calculateReservationTimeout(location, parkingLocation);
      setDistanceResult(result);
      return result;
    } catch (err: any) {
      const message = err?.message || 'Error al obtener ubicación';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { userLocation, distanceResult, loading, error, calculateTimeout, clearError };
}
