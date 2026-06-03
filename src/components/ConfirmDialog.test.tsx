import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

describe("<ConfirmDialog />", () => {
  const defaults = {
    open: true,
    onOpenChange: vi.fn(),
    title: "¿Eliminar sesión?",
    description: "Esta acción no se puede deshacer.",
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza título y descripción cuando está abierto", () => {
    render(<ConfirmDialog {...defaults} />);
    expect(screen.getByText("¿Eliminar sesión?")).toBeInTheDocument();
    expect(screen.getByText("Esta acción no se puede deshacer.")).toBeInTheDocument();
  });

  it("usa labels por defecto Confirmar / Cancelar", () => {
    render(<ConfirmDialog {...defaults} />);
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });

  it("respeta labels personalizados", () => {
    render(
      <ConfirmDialog
        {...defaults}
        confirmLabel="Sí, eliminar"
        cancelLabel="Volver"
      />,
    );
    expect(screen.getByRole("button", { name: "Sí, eliminar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("invoca onConfirm al pulsar el botón de confirmar", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaults} onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("muestra estado 'Procesando...' y deshabilita botones cuando loading=true", () => {
    render(<ConfirmDialog {...defaults} loading />);
    expect(screen.getByRole("button", { name: /procesando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
  });

  it("aplica clases destructive cuando variant='destructive'", () => {
    render(<ConfirmDialog {...defaults} variant="destructive" />);
    const action = screen.getByRole("button", { name: /confirmar/i });
    expect(action.className).toMatch(/bg-destructive/);
  });

  it("no renderiza el contenido cuando open=false", () => {
    render(<ConfirmDialog {...defaults} open={false} />);
    expect(screen.queryByText("¿Eliminar sesión?")).not.toBeInTheDocument();
  });
});
