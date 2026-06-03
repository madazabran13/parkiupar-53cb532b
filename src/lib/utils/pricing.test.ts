import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateParkingFee, calculateLiveFee } from "./pricing";

describe("calculateParkingFee", () => {
  it("retorna ceros cuando la salida ocurre antes que la entrada", () => {
    const entry = "2026-01-01T12:00:00Z";
    const exit = "2026-01-01T11:00:00Z";
    const result = calculateParkingFee(entry, exit, 4000);
    expect(result).toEqual({ totalMinutes: 0, fractions: 0, costPerFraction: 0, total: 0 });
  });

  it("retorna ceros cuando entrada y salida son iguales", () => {
    const t = "2026-01-01T12:00:00Z";
    const result = calculateParkingFee(t, t, 4000);
    expect(result.total).toBe(0);
    expect(result.fractions).toBe(0);
  });

  it("cobra una fracción completa por cualquier tiempo > 0 dentro de la primera fracción", () => {
    const entry = "2026-01-01T12:00:00Z";
    const exit = "2026-01-01T12:01:00Z";
    const result = calculateParkingFee(entry, exit, 4000, 15);
    expect(result.fractions).toBe(1);
    expect(result.costPerFraction).toBe(1000);
    expect(result.total).toBe(1000);
  });

  it("cobra exactamente una hora con 4 fracciones de 15 min", () => {
    const entry = "2026-01-01T12:00:00Z";
    const exit = "2026-01-01T13:00:00Z";
    const result = calculateParkingFee(entry, exit, 4000, 15);
    expect(result.totalMinutes).toBe(60);
    expect(result.fractions).toBe(4);
    expect(result.total).toBe(4000);
  });

  it("cobra fracción siguiente con 1 minuto extra (ceil)", () => {
    const entry = "2026-01-01T12:00:00Z";
    const exit = "2026-01-01T13:01:00Z";
    const result = calculateParkingFee(entry, exit, 4000, 15);
    expect(result.fractions).toBe(5);
    expect(result.total).toBe(5000);
  });

  it("usa fractionMinutes por defecto = 15 si no se especifica", () => {
    const entry = "2026-01-01T12:00:00Z";
    const exit = "2026-01-01T12:30:00Z";
    const result = calculateParkingFee(entry, exit, 4000);
    expect(result.fractions).toBe(2);
    expect(result.total).toBe(2000);
  });

  it("respeta fractionMinutes personalizado (30 min)", () => {
    const entry = "2026-01-01T12:00:00Z";
    const exit = "2026-01-01T13:00:00Z";
    const result = calculateParkingFee(entry, exit, 4000, 30);
    expect(result.fractions).toBe(2);
    expect(result.costPerFraction).toBe(2000);
    expect(result.total).toBe(4000);
  });

  it("acepta objetos Date además de string", () => {
    const entry = new Date("2026-01-01T12:00:00Z");
    const exit = new Date("2026-01-01T12:45:00Z");
    const result = calculateParkingFee(entry, exit, 4000, 15);
    expect(result.fractions).toBe(3);
    expect(result.total).toBe(3000);
  });

  it("redondea el total con Math.round (rate no múltiplo)", () => {
    const entry = "2026-01-01T12:00:00Z";
    const exit = "2026-01-01T12:15:00Z";
    const result = calculateParkingFee(entry, exit, 3333, 15);
    expect(result.costPerFraction).toBeCloseTo(833.25, 2);
    expect(result.total).toBe(833);
  });

  it("calcula sesiones largas (8 horas) correctamente", () => {
    const entry = "2026-01-01T08:00:00Z";
    const exit = "2026-01-01T16:00:00Z";
    const result = calculateParkingFee(entry, exit, 4000, 15);
    expect(result.totalMinutes).toBe(480);
    expect(result.fractions).toBe(32);
    expect(result.total).toBe(32000);
  });
});

describe("calculateLiveFee", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T13:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calcula tarifa acumulada desde entryTime hasta el reloj actual", () => {
    const entry = "2026-01-01T12:00:00Z";
    expect(calculateLiveFee(entry, 4000, 15)).toBe(4000);
  });

  it("retorna 0 si entryTime está en el futuro", () => {
    const entry = "2026-01-01T14:00:00Z";
    expect(calculateLiveFee(entry, 4000, 15)).toBe(0);
  });

  it("usa fractionMinutes por defecto = 15 cuando no se pasa", () => {
    const entry = "2026-01-01T12:30:00Z";
    expect(calculateLiveFee(entry, 4000)).toBe(2000);
  });
});
