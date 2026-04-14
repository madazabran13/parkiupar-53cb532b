/**
 * Service barrel export — Dependency Inversion principle.
 * Components depend on service abstractions, not Supabase directly.
 */
export { ParkingService } from './parking.service';
export { SpaceService } from './space.service';
export { ReservationService } from './reservation.service';
export { VehicleService } from './vehicle.service';
export { CustomerService } from './customer.service';
export { BillingService } from './billing.service';
export { IncidentService } from './incident.service';
export { ReportService } from './report.service';
export { TeamService } from './team.service';
export { TenantService } from './tenant.service';
export { GeolocationService, getUserLocation, calculateReservationTimeout } from './geolocation.service';
export type { GeoCoordinates, DistanceResult } from './geolocation.service';
export type { CreateSessionDTO, CompleteSessionDTO } from './parking.service';
export type { CreateReservationDTO } from './reservation.service';
