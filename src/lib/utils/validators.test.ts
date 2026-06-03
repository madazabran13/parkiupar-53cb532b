import { describe, it, expect } from "vitest";
import { normalizePlate, isValidPlate } from "./validators";

describe("normalizePlate", () => {
  it("pasa a mayúsculas", () => {
    expect(normalizePlate("abc123")).toBe("ABC123");
  });

  it("elimina espacios", () => {
    expect(normalizePlate("ABC 123")).toBe("ABC123");
  });

  it("elimina guiones", () => {
    expect(normalizePlate("ABC-123")).toBe("ABC123");
  });

  it("elimina caracteres no alfanuméricos", () => {
    expect(normalizePlate("A.B/C@123!")).toBe("ABC123");
  });

  it("mantiene cadena vacía vacía", () => {
    expect(normalizePlate("")).toBe("");
  });
});

describe("isValidPlate", () => {
  it.each([
    ["ABC123", true, "3 letras + 3 dígitos clásico"],
    ["ABC12", true, "3 letras + 2 dígitos (moto)"],
    ["ABC12D", true, "3 letras + 2 dígitos + letra final"],
    ["ABC123D", true, "3 letras + 3 dígitos + letra final"],
    ["abc-123", true, "se normaliza antes de validar"],
    ["abc 12d", true, "se normaliza antes de validar"],
  ])("acepta placa válida %s (%s)", (input, expected) => {
    expect(isValidPlate(input)).toBe(expected);
  });

  it.each([
    ["AB123", "solo 2 letras iniciales"],
    ["ABCD123", "4 letras iniciales"],
    ["ABC1", "solo 1 dígito"],
    ["ABC1234", "4 dígitos"],
    ["123ABC", "orden invertido"],
    ["ABC", "sin dígitos"],
    ["", "cadena vacía"],
    ["ABC12DD", "dos letras finales"],
  ])("rechaza placa inválida %s (%s)", (input) => {
    expect(isValidPlate(input)).toBe(false);
  });
});
