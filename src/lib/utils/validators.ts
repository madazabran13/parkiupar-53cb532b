/**
 * Placa Colombia: 3 letras + 2-3 dígitos, opcional letra final.
 * Ejemplos válidos: ABC123, ABC12, ABC12D, ABC123D.
 */
const PLATE_REGEX = /^[A-Z]{3}\d{2,3}[A-Z]?$/;

export function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidPlate(input: string): boolean {
  return PLATE_REGEX.test(normalizePlate(input));
}
