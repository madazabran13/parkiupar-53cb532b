/**
 * Calculate parking fee based on fractions.
 * Fraction started = fraction fully charged.
 */
export function calculateParkingFee(
  entryTime: string | Date,
  exitTime: string | Date,
  ratePerHour: number,
  fractionMinutes: number = 15
): { totalMinutes: number; fractions: number; costPerFraction: number; total: number } {
  const entry = new Date(entryTime);
  const exit = new Date(exitTime);
  const totalMinutes = (exit.getTime() - entry.getTime()) / (1000 * 60);

  if (totalMinutes <= 0) {
    return { totalMinutes: 0, fractions: 0, costPerFraction: 0, total: 0 };
  }

  const fractions = Math.ceil(totalMinutes / fractionMinutes);
  const costPerFraction = (ratePerHour * fractionMinutes) / 60;
  const total = Math.round(fractions * costPerFraction);

  return { totalMinutes: Math.round(totalMinutes), fractions, costPerFraction, total };
}

/**
 * Calculate live accumulated fee from entry time to now.
 */
export function calculateLiveFee(
  entryTime: string | Date,
  ratePerHour: number,
  fractionMinutes: number = 15
): number {
  return calculateParkingFee(entryTime, new Date(), ratePerHour, fractionMinutes).total;
}
