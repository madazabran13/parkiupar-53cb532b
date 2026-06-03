import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  formatTime,
  formatDuration,
  formatRelativeTime,
} from "./formatters";

describe("formatCurrency", () => {
  it("formatea monto positivo como COP sin decimales", () => {
    const result = formatCurrency(4500);
    expect(result).toMatch(/\$\s*4\.500/);
  });

  it("formatea cero como $0", () => {
    expect(formatCurrency(0)).toMatch(/\$\s*0/);
  });

  it("redondea decimales (sin parte decimal en la salida)", () => {
    const result = formatCurrency(1234.56);
    expect(result).not.toContain(",56");
    expect(result).not.toContain(".56");
  });

  it("formatea montos grandes con separadores", () => {
    const result = formatCurrency(1_500_000);
    expect(result).toMatch(/1\.500\.000/);
  });
});

describe("formatDateTime / formatDate / formatTime", () => {
  it("formatea fecha+hora en dd/MM/yyyy HH:mm", () => {
    const result = formatDateTime("2026-03-05T14:30:00Z");
    expect(result).toMatch(/^\d{2}\/\d{2}\/2026 \d{2}:\d{2}$/);
  });

  it("formatea solo fecha en dd/MM/yyyy", () => {
    const result = formatDate("2026-03-05T14:30:00Z");
    expect(result).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });

  it("formatea solo hora en HH:mm", () => {
    const result = formatTime("2026-03-05T14:30:00Z");
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it("acepta tanto string como Date", () => {
    const date = new Date("2026-03-05T14:30:00Z");
    expect(formatDate(date)).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });
});

describe("formatDuration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T13:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra solo minutos cuando < 1 hora", () => {
    expect(formatDuration("2026-01-01T12:45:00Z", "2026-01-01T13:00:00Z")).toBe("15min");
  });

  it("muestra horas y minutos cuando >= 1 hora", () => {
    expect(formatDuration("2026-01-01T10:30:00Z", "2026-01-01T13:00:00Z")).toBe("2h 30min");
  });

  it("usa el reloj actual cuando exitTime es null", () => {
    expect(formatDuration("2026-01-01T12:30:00Z", null)).toBe("30min");
  });

  it("usa el reloj actual cuando exitTime es undefined", () => {
    expect(formatDuration("2026-01-01T12:00:00Z")).toBe("1h 0min");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T13:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve un texto en español con sufijo 'hace'", () => {
    const result = formatRelativeTime("2026-01-01T12:00:00Z");
    expect(result).toMatch(/hace/);
  });
});
