/**
 * Service barrel export — Dependency Inversion principle.
 * Components depend on service abstractions, not Supabase directly.
 */
export { ParkingService } from './parking.service';
export { SpaceService } from './space.service';
export { ReservationService } from './reservation.service';
export { VehicleService } from './vehicle.service';
export { CustomerService } from './customer.service';
export { GeolocationService, getUserLocation, calculateReservationTimeout } from './geolocation.service';
export type { GeoCoordinates, DistanceResult } from './geolocation.service';
export type { CreateSessionDTO, CompleteSessionDTO } from './parking.service';
export type { CreateReservationDTO } from './reservation.service';
