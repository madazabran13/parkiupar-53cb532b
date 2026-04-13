/**
 * useRateStrategy — Strategy pattern for resolving parking rates.
 * 
 * Rate resolution hierarchy:
 * 1. vehicle_rates (by vehicle_type)
 * 2. vehicle_categories (by icon/name match)
 * 3. Session stored rate (fallback)
 * 
 * Single Responsibility: only resolves rates.
 * Open/Closed: add new strategies without modifying existing ones.
 */
import { useMemo } from 'react';
import type { ParkingSession, VehicleRate, VehicleCategory } from '@/types';

export interface ResolvedRate {
  ratePerHour: number;
  fractionMinutes: number;
  source: 'vehicle_rates' | 'vehicle_categories' | 'session' | 'none';
}

type RateStrategy = (session: ParkingSession) => ResolvedRate | null;

function createVehicleRateStrategy(rates: VehicleRate[]): RateStrategy {
  const rateMap = new Map(rates.map(r => [r.vehicle_type, r]));
  return (session) => {
    const rate = rateMap.get(session.vehicle_type);
    if (!rate) return null;
    return {
      ratePerHour: rate.rate_per_hour,
      fractionMinutes: rate.fraction_minutes,
      source: 'vehicle_rates',
    };
  };
}

function createCategoryStrategy(categories: VehicleCategory[]): RateStrategy {
  return (session) => {
    const cat =
      categories.find(c => c.name.toLowerCase() === session.vehicle_type?.toLowerCase()) ||
      categories.find(c => c.icon === session.vehicle_type);
    if (!cat) return null;
    return {
      ratePerHour: cat.rate_per_hour,
      fractionMinutes: cat.fraction_minutes,
      source: 'vehicle_categories',
    };
  };
}

function sessionFallbackStrategy(session: ParkingSession): ResolvedRate | null {
  if (session.rate_per_hour && session.rate_per_hour > 0) {
    return {
      ratePerHour: session.rate_per_hour,
      fractionMinutes: 15,
      source: 'session',
    };
  }
  return null;
}

export function useRateStrategy(rates: VehicleRate[], categories: VehicleCategory[]) {
  const strategies = useMemo<RateStrategy[]>(() => [
    createVehicleRateStrategy(rates),
    createCategoryStrategy(categories),
    sessionFallbackStrategy,
  ], [rates, categories]);

  const resolveRate = useMemo(() => {
    return (session: ParkingSession): ResolvedRate => {
      for (const strategy of strategies) {
        const result = strategy(session);
        if (result) return result;
      }
      return { ratePerHour: 0, fractionMinutes: 15, source: 'none' };
    };
  }, [strategies]);

  /** Resolve rate from category (for capacity grid) */
  const resolveFromCategory = useMemo(() => {
    return (vehicleType: string): ResolvedRate => {
      const cat =
        categories.find(c => c.name.toLowerCase() === vehicleType?.toLowerCase()) ||
        categories.find(c => c.icon === vehicleType);
      if (cat) {
        return { ratePerHour: cat.rate_per_hour, fractionMinutes: cat.fraction_minutes, source: 'vehicle_categories' };
      }
      return { ratePerHour: 0, fractionMinutes: 15, source: 'none' };
    };
  }, [categories]);

  return { resolveRate, resolveFromCategory };
}
