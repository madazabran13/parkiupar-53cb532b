import {
  Car, CarFront, CarTaxiFront, Bike, Truck, Bus,
  Ambulance, Caravan, Tractor,
  type LucideIcon,
} from 'lucide-react';
import type { VehicleType } from '@/types';

export interface VehicleIconOption {
  value: string;
  label: string;
  icon: LucideIcon;
  vehicleType: VehicleType;
}

export const VEHICLE_ICON_OPTIONS: VehicleIconOption[] = [
  { value: 'car', label: 'Carro', icon: Car, vehicleType: 'car' },
  { value: 'car_front', label: 'Camioneta', icon: CarFront, vehicleType: 'car' },
  { value: 'taxi', label: 'Taxi', icon: CarTaxiFront, vehicleType: 'car' },
  { value: 'motorcycle', label: 'Moto', icon: Bike, vehicleType: 'motorcycle' },
  { value: 'bicycle', label: 'Bicicleta', icon: Bike, vehicleType: 'bicycle' },
  { value: 'truck', label: 'Camión', icon: Truck, vehicleType: 'truck' },
  { value: 'bus', label: 'Bus', icon: Bus, vehicleType: 'truck' },
  { value: 'ambulance', label: 'Ambulancia', icon: Ambulance, vehicleType: 'truck' },
  { value: 'caravan', label: 'Caravana', icon: Caravan, vehicleType: 'truck' },
  { value: 'tractor', label: 'Tractor', icon: Tractor, vehicleType: 'truck' },
];

const ICON_BY_VALUE: Record<string, LucideIcon> = Object.fromEntries(
  VEHICLE_ICON_OPTIONS.map((o) => [o.value, o.icon]),
);

const VEHICLE_TYPE_BY_ICON: Record<string, VehicleType> = Object.fromEntries(
  VEHICLE_ICON_OPTIONS.map((o) => [o.value, o.vehicleType]),
);

export function resolveVehicleIcon(value?: string | null): LucideIcon {
  if (!value) return Car;
  return ICON_BY_VALUE[value] || Car;
}

export function resolveVehicleType(iconValue?: string | null): VehicleType {
  if (!iconValue) return 'car';
  return VEHICLE_TYPE_BY_ICON[iconValue] || 'car';
}
